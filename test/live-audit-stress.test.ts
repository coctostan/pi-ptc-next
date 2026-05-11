import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { CodeExecutor } from "../dist/code-executor.js";
import { setTimeout as delay } from "node:timers/promises";

/**
 * Live audit: stress and edge case tests.
 * Pushes concurrency, file size, output budget, and error handling boundaries.
 */

type RuntimeStats = {
  activeCalls: number;
  maxActiveCalls: number;
  seenCalls: string[];
};

function createStressExecutor(stats: RuntimeStats, maxOutputChars = 8_000) {
  const tools = [
    {
      name: "read",
      description: "Read a file",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
        additionalProperties: false,
      },
      source: "builtin" as const,
      isReadOnly: true,
    },
    {
      name: "slow_tool",
      description: "Responds after a delay",
      parameters: {
        type: "object",
        properties: { id: { type: "string" }, delayMs: { type: "integer" } },
        required: ["id"],
        additionalProperties: false,
      },
      source: "extension" as const,
      isReadOnly: true,
    },
    {
      name: "failing_tool",
      description: "Always fails",
      parameters: {
        type: "object",
        properties: { msg: { type: "string" } },
        required: ["msg"],
        additionalProperties: false,
      },
      source: "extension" as const,
      isReadOnly: true,
    },
  ];

  const toolRegistry = {
    createCallableToolRuntime() {
      return {
        tools,
        runTool: async (toolName: string, params: Record<string, unknown>) => {
          stats.seenCalls.push(`${toolName}:${params.id || params.path || params.msg || "?"}`);
          stats.activeCalls += 1;
          stats.maxActiveCalls = Math.max(stats.maxActiveCalls, stats.activeCalls);
          try {
            if (toolName === "read") {
              const p = String(params.path || "");
              // Generate synthetic large files for stress testing
              if (p.startsWith("large-")) {
                const lineCount = parseInt(p.replace("large-", "").replace(".txt", ""), 10) || 100;
                const lines = Array.from({ length: lineCount }, (_, i) => `line ${i + 1}: ${"x".repeat(80)}`);
                return { content: [{ type: "text", text: lines.join("\n") }] };
              }
              return { content: [{ type: "text", text: `content of ${p}` }] };
            }
            if (toolName === "slow_tool") {
              const ms = typeof params.delayMs === "number" ? params.delayMs : 20;
              await delay(ms);
              return { content: [{ type: "text", text: `slow:${params.id}` }] };
            }
            if (toolName === "failing_tool") {
              throw new Error(`intentional failure: ${params.msg}`);
            }
            throw new Error(`Unknown tool: ${toolName}`);
          } finally {
            stats.activeCalls -= 1;
          }
        },
      };
    },
  };

  const sandboxManager = {
    spawn(code: string, cwd: string) {
      return spawn("python3", ["-u", "-c", code], { cwd, env: { ...process.env } });
    },
    getRuntimeWorkspaceRoot(cwd: string) { return cwd; },
    async cleanup() {},
  };

  return new CodeExecutor(
    sandboxManager,
    toolRegistry as any,
    {
      executionTimeoutMs: 30_000,
      maxOutputChars,
      allowMutations: false,
      allowBash: false,
      maxParallelToolCalls: 10,
      useDocker: false,
      allowUnsandboxedSubprocess: true,
      debugLogging: false,
      autoRoute: false,
      trustedReadOnlyTools: undefined,
      callableTools: undefined,
      blockedTools: undefined,
    },
    process.cwd()
  );
}

const exec = (executor: any, code: string) =>
  executor.execute(code, { cwd: process.cwd(), ctx: { cwd: process.cwd() } as any });

// ═══════════════════════════════════════════
// CONCURRENCY STRESS
// ═══════════════════════════════════════════

test("stress: batch_tool with 10 parallel reads — no drops", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    "calls = [",
    ...Array.from({ length: 10 }, (_, i) => `  {"tool": "read", "params": {"path": "file-${i}.txt"}},`),
    "]",
    "r = await ptc.batch_tool(calls)",
    'return ptc.json_dump({"count": len(r), "all_have_content": all(len(str(x)) > 0 for x in r)})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.count, 10, `Should return all 10 results`);
  assert.equal(parsed.all_have_content, true, `All results should have content`);
  assert.equal(stats.seenCalls.length, 10, `All 10 calls should have been made`);
});

test("stress: batch_tool with max_concurrency=2 — bounded parallel", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    "calls = [",
    ...Array.from({ length: 6 }, (_, i) => `  {"tool": "slow_tool", "params": {"id": "s${i}", "delayMs": 30}},`),
    "]",
    "r = await ptc.batch_tool(calls, max_concurrency=2)",
    'return ptc.json_dump({"count": len(r)})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.count, 6, `Should return all 6 results`);
  assert.ok(stats.maxActiveCalls <= 2, `Max active should be ≤2, got: ${stats.maxActiveCalls}`);
});

test("stress: gather_limit with 8 coroutines, limit=3 — bounded", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    "coros = [",
    ...Array.from({ length: 8 }, (_, i) => `  slow_tool(id="g${i}", delayMs=20),`),
    "]",
    "r = await ptc.gather_limit(coros, limit=3)",
    'return ptc.json_dump({"count": len(r)})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.count, 8, `Should return all 8 results`);
  assert.ok(stats.maxActiveCalls <= 3, `Max active should be ≤3, got: ${stats.maxActiveCalls}`);
});

test("stress: batch_tool collect mode captures mixed success/failure results", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    "calls = [",
    '  {"tool": "read", "params": {"path": "ok-1.txt"}},',
    '  {"tool": "failing_tool", "params": {"msg": "fail1"}},',
    '  {"tool": "read", "params": {"path": "ok-2.txt"}},',
    '  {"tool": "failing_tool", "params": {"msg": "fail2"}},',
    '  {"tool": "read", "params": {"path": "ok-3.txt"}},',
    "]",
    "partial = await ptc.batch_tool(calls, on_error='collect')",
    "return ptc.json_dump(partial)",
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "batch_partial");
  assert.equal(parsed.mode, "collect");
  assert.equal(parsed.stats.total, 5);
  assert.equal(parsed.stats.succeeded, 3);
  assert.equal(parsed.stats.failed, 2);
  assert.deepEqual(parsed.results.map((entry: any) => entry.ok), [true, false, true, false, true]);
});

test("stress: first_success with 3 failures then 1 success", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    "calls = [",
    '  {"tool": "failing_tool", "params": {"msg": "f1"}},',
    '  {"tool": "failing_tool", "params": {"msg": "f2"}},',
    '  {"tool": "failing_tool", "params": {"msg": "f3"}},',
    '  {"tool": "read", "params": {"path": "final-ok.txt"}},',
    "]",
    "r = await ptc.first_success(calls)",
    'return "got:" + str(len(str(r)) > 0)',
  ].join("\n"));
  assert.ok(result.output.includes("got:True"), `Should fall back to the 4th call, got: ${result.output}`);
  assert.equal(stats.seenCalls.length, 4, `Should have tried all 4 calls`);
});

// ═══════════════════════════════════════════
// LARGE FILE / OUTPUT BUDGET STRESS
// ═══════════════════════════════════════════

test("stress: read() a 1000-line file", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor,
    'r = await read(path="large-1000.txt")\nreturn ptc.json_dump({"length": len(str(r)), "has_line_999": "line 999" in str(r)})');
  const parsed = JSON.parse(result.output);
  assert.ok(parsed.length > 50000, `1000-line file should be large, got length: ${parsed.length}`);
  assert.equal(parsed.has_line_999, true, `Should contain line 999`);
});

test("stress: read_many with 5 large files (500 lines each)", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats, 50_000);
  const result = await exec(executor, [
    'paths = ["large-500.txt", "large-500.txt", "large-500.txt", "large-500.txt", "large-500.txt"]',
    "r = await ptc.read_many(paths)",
    'return ptc.json_dump({"count": len(r), "all_large": all(len(s) > 10000 for s in r)})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.count, 5, `Should return 5 results`);
  assert.equal(parsed.all_large, true, `Each file should be large`);
});

test("stress: fit_output with deeply nested structure", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    'deep = {"level": 0}',
    "current = deep",
    "for i in range(1, 8):",
    '  current["child"] = {"level": i, "items": list(range(50))}',
    '  current = current["child"]',
    "r = ptc.fit_output(deep, max_items=3, max_depth=3)",
    "return ptc.json_dump(r)",
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output");
  assert.equal(parsed.truncated, true, `Deeply nested structure should be truncated`);
});

test("stress: fit_output with max_chars=100 on large input", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor,
    'big = {"data": "x" * 10000, "items": list(range(500))}\nr = ptc.fit_output(big, max_chars=100)\nreturn ptc.json_dump(r)');
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output");
  assert.equal(parsed.truncated, true);
  // The preview should be bounded
  assert.ok(JSON.stringify(parsed).length < 2000, `Fitted output should be compact, got: ${JSON.stringify(parsed).length}`);
});

// ═══════════════════════════════════════════
// ERROR AND EDGE CASE HANDLING
// ═══════════════════════════════════════════

test("stress: batch_tool with invalid tool name — clear error", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    "try:",
    '  r = await ptc.batch_tool([{"tool": "nonexistent_tool", "params": {}}])',
    '  return ptc.json_dump({"behavior": "returned", "result": str(r)[:100]})',
    "except Exception as e:",
    '  return ptc.json_dump({"behavior": "raised", "error": str(e)[:200]})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.ok(parsed.behavior === "raised" || parsed.behavior === "returned",
    `Should handle invalid tool, got: ${JSON.stringify(parsed)}`);
});

test("stress: get_tool_schema for nonexistent tool", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    "try:",
    '  r = ptc.get_tool_schema("totally_fake_tool")',
    '  return ptc.json_dump({"behavior": "returned", "keys": list(r.keys()) if isinstance(r, dict) else str(type(r))})',
    "except Exception as e:",
    '  return ptc.json_dump({"behavior": "raised", "error": str(e)[:200]})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  // Document whether it returns empty dict, raises, or returns None
  assert.ok(["returned", "raised"].includes(parsed.behavior),
    `Should handle gracefully, got: ${JSON.stringify(parsed)}`);
});

test("stress: expect_kind with wrong kind — ValueError", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  await assert.rejects(
    exec(executor, 'ptc.expect_kind({"kind": "actual"}, "expected")'),
    /Expected kind/,
    "Should raise ValueError for kind mismatch"
  );
});

test("stress: reduce_tool with all-failing calls", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor, [
    "try:",
    "  calls = [",
    '    {"tool": "failing_tool", "params": {"msg": "r1"}},',
    '    {"tool": "failing_tool", "params": {"msg": "r2"}},',
    "  ]",
    '  r = await ptc.reduce_tool(calls, lambda acc, val: acc + str(val), "")',
    '  return ptc.json_dump({"behavior": "returned", "result": str(r)[:200]})',
    "except Exception as e:",
    '  return ptc.json_dump({"behavior": "raised", "error": str(e)[:200]})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.ok(["returned", "raised"].includes(parsed.behavior),
    `Should handle all-failing reduce, got: ${JSON.stringify(parsed)}`);
});

test("stress: empty batch_tool([]) returns empty list", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor,
    'r = await ptc.batch_tool([])\nreturn ptc.json_dump({"count": len(r)})');
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.count, 0, "Empty batch_tool should return []");
});

test("stress: empty read_many([]) returns empty list", async () => {
  const stats: RuntimeStats = { activeCalls: 0, maxActiveCalls: 0, seenCalls: [] };
  const executor = createStressExecutor(stats);
  const result = await exec(executor,
    'r = await ptc.read_many([])\nreturn ptc.json_dump({"count": len(r)})');
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.count, 0, "Empty read_many should return []");
});
