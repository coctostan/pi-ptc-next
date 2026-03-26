import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { CodeExecutor } from "../dist/code-executor.js";
import { PtcPythonError } from "../dist/execution/execution-errors.js";

type ReductionToolStub = {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string }>;
    required: string[];
    additionalProperties: boolean;
  };
  source: "builtin" | "extension";
  isReadOnly: boolean;
};

type RuntimeStats = {
  activeCalls: number;
  maxActiveCalls: number;
  seenCalls: string[];
};

function createExecutor(stats: RuntimeStats, maxOutputChars = 1_000) {
  const sandboxManager = {
    spawn(code: string, cwd: string) {
      return spawn("python3", ["-u", "-c", code], {
        cwd,
        env: { ...process.env },
      });
    },
    getRuntimeWorkspaceRoot(cwd: string) {
      return cwd;
    },
    async cleanup() {},
  };

  const tools: ReductionToolStub[] = [
    {
      name: "record_value",
      description: "Return a structured record after an optional delay",
      parameters: {
        type: "object",
        properties: {
          value: { type: "string" },
          label: { type: "string" },
          delayMs: { type: "integer" },
        },
        required: ["value"],
        additionalProperties: false,
      },
      source: "extension",
      isReadOnly: true,
    },
  ];

  const toolRegistry = {
    createCallableToolRuntime() {
      return {
        tools,
        runTool: async (toolName: string, params: Record<string, unknown>) => {
          const label = typeof params.label === "string"
            ? params.label
            : typeof params.value === "string"
              ? params.value
              : "<none>";

          stats.seenCalls.push(`${toolName}:${label}`);
          stats.activeCalls += 1;
          stats.maxActiveCalls = Math.max(stats.maxActiveCalls, stats.activeCalls);

          try {
            const delayMs = typeof params.delayMs === "number" ? params.delayMs : 0;
            if (delayMs > 0) {
              await delay(delayMs);
            }

            if (toolName !== "record_value") {
              throw new Error(`Unexpected nested tool call: ${toolName}`);
            }

            const value = typeof params.value === "string" ? params.value : "";
            return {
              content: [{ type: "text", text: JSON.stringify({ value }) }],
              details: {
                ptcValue: {
                  tool: toolName,
                  value,
                },
              },
            };
          } finally {
            stats.activeCalls -= 1;
          }
        },
      };
    },
  };

  return new CodeExecutor(
    sandboxManager,
    toolRegistry as any,
    {
      executionTimeoutMs: 10_000,
      maxOutputChars,
      allowMutations: false,
      allowBash: false,
      maxParallelToolCalls: 4,
      useDocker: false,
      allowUnsandboxedSubprocess: true,
      debugLogging: false,
      autoRoute: false,
      trustedReadOnlyTools: undefined,
      callableTools: undefined,
      blockedTools: undefined,
    },
    process.cwd(),
  );
}

test("ptc.reduce_tool reduces ordered nested results while respecting bounded concurrency", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats);

  const result = await executor.execute(
    [
      "reduced = await ptc.reduce_tool([",
      '  {"tool": "record_value", "params": {"value": "slow", "label": "slow", "delayMs": 40}},',
      '  {"tool": "record_value", "params": {"value": "fast-1", "label": "fast-1", "delayMs": 5}},',
      '  {"tool": "record_value", "params": {"value": "fast-2", "label": "fast-2", "delayMs": 5}},',
      "], lambda acc, entry: acc + [entry['value']], initial=[], max_concurrency=2)",
      "return reduced",
    ].join("\n"),
    {
      cwd: process.cwd(),
      ctx: ({ cwd: process.cwd() } as any),
    },
  );

  assert.deepEqual(JSON.parse(result.output), ["slow", "fast-1", "fast-2"]);
  assert.equal(stats.maxActiveCalls, 2);
  assert.deepEqual(stats.seenCalls, [
    "record_value:slow",
    "record_value:fast-1",
    "record_value:fast-2",
  ]);
});

test("ptc.fit_output uses the session output budget by default and preserves truncation metadata", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats, 600);

  const result = await executor.execute(
    [
      "payload = {",
      '  "summary": "y" * 240,',
      '  "items": [{"index": i, "text": "x" * 48} for i in range(6)]',
      "}",
      "return ptc.fit_output(payload, max_items=2, max_depth=2)",
    ].join("\n"),
    {
      cwd: process.cwd(),
      ctx: ({ cwd: process.cwd() } as any),
    },
  );

  assert.doesNotMatch(result.output, /\[Output truncated - showing first/);
  assert.ok(result.output.length <= 600);

  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output");
  assert.equal(parsed.originalKind, "dict");
  assert.equal(parsed.limits.maxChars, 600);
  assert.equal(parsed.limits.maxItems, 2);
  assert.equal(parsed.limits.maxDepth, 2);
  assert.equal(parsed.truncated, true);
  assert.ok(parsed.stats.originalChars > parsed.stats.previewChars);
  assert.ok(parsed.stats.omittedItems > 0 || parsed.stats.omittedKeys > 0 || parsed.stats.depthLimited);
});

test("ptc.fit_output respects explicit smaller override budgets", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats, 1_000);

  const result = await executor.execute(
    [
      "payload = [",
      '  {"index": i, "text": "z" * 60, "nested": {"items": list(range(5))}}',
      "  for i in range(5)",
      "]",
      "return ptc.fit_output(payload, max_chars=500, max_items=1, max_depth=1)",
    ].join("\n"),
    {
      cwd: process.cwd(),
      ctx: ({ cwd: process.cwd() } as any),
    },
  );

  assert.doesNotMatch(result.output, /\[Output truncated - showing first/);
  assert.ok(result.output.length <= 500);

  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output");
  assert.equal(parsed.limits.maxChars, 500);
  assert.equal(parsed.limits.maxItems, 1);
  assert.equal(parsed.limits.maxDepth, 1);
  assert.equal(parsed.truncated, true);
});

test("reduction and output-budget helpers reject invalid inputs with clear bounded errors", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats);

  await assert.rejects(
    executor.execute(
      [
        'await ptc.reduce_tool([{"tool": "record_value", "params": {"value": "x"}}], None, initial=[])',
        "return 'unreachable'",
      ].join("\n"),
      {
        cwd: process.cwd(),
        ctx: ({ cwd: process.cwd() } as any),
      },
    ),
    (error: InstanceType<typeof PtcPythonError>) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.rawMessage, /reducer must be callable/);
      return true;
    },
  );

  await assert.rejects(
    executor.execute(
      [
        'return ptc.fit_output({"value": "x"}, max_chars=0)',
      ].join("\n"),
      {
        cwd: process.cwd(),
        ctx: ({ cwd: process.cwd() } as any),
      },
    ),
    (error: InstanceType<typeof PtcPythonError>) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.rawMessage, /max_chars must be a positive integer/);
      return true;
    },
  );

  await assert.rejects(
    executor.execute(
      [
        'return ptc.fit_output(set([1, 2, 3]))',
      ].join("\n"),
      {
        cwd: process.cwd(),
        ctx: ({ cwd: process.cwd() } as any),
      },
    ),
    (error: InstanceType<typeof PtcPythonError>) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.rawMessage, /fit_output only supports JSON-safe values/);
      return true;
    },
  );
});
