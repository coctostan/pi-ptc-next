import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { CodeExecutor } from "../dist/code-executor.js";
import { PtcPythonError } from "../dist/execution/execution-errors.js";

type OrchestrationToolStub = {
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

function createExecutor(stats: RuntimeStats) {
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

  const tools: OrchestrationToolStub[] = [
    {
      name: "record_value",
      description: "Return a structured record after an optional delay",
      parameters: {
        type: "object",
        properties: {
          value: { type: "string" },
          delayMs: { type: "integer" },
        },
        required: ["value"],
        additionalProperties: false,
      },
      source: "extension",
      isReadOnly: true,
    },
    {
      name: "always_fail",
      description: "Fail with a deterministic message after an optional delay",
      parameters: {
        type: "object",
        properties: {
          label: { type: "string" },
          message: { type: "string" },
          delayMs: { type: "integer" },
        },
        required: ["message"],
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

            if (toolName === "always_fail") {
              throw new Error(typeof params.message === "string" ? params.message : "tool failed");
            }

            if (toolName === "record_value") {
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
            }

            throw new Error(`Unexpected nested tool call: ${toolName}`);
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
      maxOutputChars: 10_000,
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

test("ptc.batch_tool preserves input order while respecting bounded concurrency", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats);

  const result = await executor.execute(
    [
      "results = await ptc.batch_tool([",
      '  {"tool": "record_value", "params": {"value": "slow", "delayMs": 40}},',
      '  {"tool": "record_value", "params": {"value": "fast-1", "delayMs": 5}},',
      '  {"tool": "record_value", "params": {"value": "fast-2", "delayMs": 5}},',
      "], max_concurrency=2)",
      'return [entry["value"] for entry in results]',
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

test("ptc.batch_tool collect mode returns bounded partial results without raising", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats);

  const result = await executor.execute(
    [
      "partial = await ptc.batch_tool([",
      '  {"tool": "record_value", "params": {"value": "ok-1", "delayMs": 5}},',
      '  {"tool": "always_fail", "params": {"label": "boom", "message": "boom"}},',
      '  {"tool": "record_value", "params": {"value": "ok-2", "delayMs": 5}},',
      "], on_error='collect')",
      "return partial",
    ].join("\n"),
    {
      cwd: process.cwd(),
      ctx: ({ cwd: process.cwd() } as any),
    },
  );

  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "batch_partial");
  assert.equal(parsed.mode, "collect");
  assert.equal(parsed.stats.total, 3);
  assert.equal(parsed.stats.succeeded, 2);
  assert.equal(parsed.stats.failed, 1);
  assert.deepEqual(parsed.results.map((entry: any) => entry.ok), [true, false, true]);
  assert.match(parsed.results[1].error, /boom/);
});

test("ptc.first_success returns the first successful ordered candidate and stops after success", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats);

  const result = await executor.execute(
    [
      "result = await ptc.first_success([",
      '  {"tool": "always_fail", "params": {"label": "first", "message": "first failed"}},',
      '  {"tool": "record_value", "params": {"value": "winner"}},',
      '  {"tool": "record_value", "params": {"value": "later"}},',
      "], max_concurrency=3)",
      'return result["value"]',
    ].join("\n"),
    {
      cwd: process.cwd(),
      ctx: ({ cwd: process.cwd() } as any),
    },
  );

  assert.equal(result.output, "winner");
  assert.deepEqual(stats.seenCalls, ["always_fail:first", "record_value:winner"]);
  assert.equal(stats.maxActiveCalls, 1);
});

test("ptc.first_success raises a bounded aggregate error when all candidates fail", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats);

  await assert.rejects(
    executor.execute(
      [
        "await ptc.first_success([",
        '  {"tool": "always_fail", "params": {"label": "first", "message": "first failed"}},',
        '  {"tool": "always_fail", "params": {"label": "second", "message": "second failed"}},',
        "])",
        "return 'unreachable'",
      ].join("\n"),
      {
        cwd: process.cwd(),
        ctx: ({ cwd: process.cwd() } as any),
      },
    ),
    (error: InstanceType<typeof PtcPythonError>) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.rawMessage, /All candidate tool calls failed:/);
      assert.match(error.rawMessage, /always_fail: first failed/);
      assert.match(error.rawMessage, /always_fail: second failed/);
      return true;
    },
  );
});

test("orchestration helpers reject invalid call specs with clear bounded errors", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createExecutor(stats);

  const emptyBatchResult = await executor.execute(
    [
      "r = await ptc.batch_tool([])",
      "return r",
    ].join("\n"),
    {
      cwd: process.cwd(),
      ctx: ({ cwd: process.cwd() } as any),
    },
  );
  assert.deepEqual(JSON.parse(emptyBatchResult.output), []);
  await assert.rejects(
    executor.execute(
      [
        "await ptc.first_success([])",
        "return 'unreachable'",
      ].join("\n"),
      {
        cwd: process.cwd(),
        ctx: ({ cwd: process.cwd() } as any),
      },
    ),
    (error: InstanceType<typeof PtcPythonError>) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.rawMessage, /Tool calls must be a non-empty sequence of call specs/);
      return true;
    },
  );

  await assert.rejects(
    executor.execute(
      [
        'await ptc.first_success([{"tool": "  ", "params": {}}])',
        "return 'unreachable'",
      ].join("\n"),
      {
        cwd: process.cwd(),
        ctx: ({ cwd: process.cwd() } as any),
      },
    ),
    (error: InstanceType<typeof PtcPythonError>) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.rawMessage, /Call spec at index 0 must include a non-empty 'tool' string/);
      return true;
    },
  );

  await assert.rejects(
    executor.execute(
      [
        'await ptc.batch_tool([{"tool": "record_value", "params": ["bad"]}])',
        "return 'unreachable'",
      ].join("\n"),
      {
        cwd: process.cwd(),
        ctx: ({ cwd: process.cwd() } as any),
      },
    ),
    (error: InstanceType<typeof PtcPythonError>) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.rawMessage, /Call spec at index 0 for tool 'record_value' must use an object for 'params'/);
      return true;
    },
  );
});
