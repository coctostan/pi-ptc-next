import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { CodeExecutor } from "../dist/code-executor.js";

/**
 * Live audit: composition workflow tests.
 * Chains 2-4 helpers per test into realistic multi-tool workflows.
 */

function createCompositionExecutor(maxOutputChars = 4_000) {
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
      name: "grep",
      description: "Search files for pattern",
      parameters: {
        type: "object",
        properties: { pattern: { type: "string" }, path: { type: "string" } },
        required: ["pattern"],
        additionalProperties: false,
      },
      source: "builtin" as const,
      isReadOnly: true,
    },
    {
      name: "search_tool",
      description: "Search returning structured results",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
        additionalProperties: false,
      },
      source: "extension" as const,
      isReadOnly: true,
    },
    {
      name: "detail_tool",
      description: "Get details for an ID",
      parameters: {
        type: "object",
        properties: { id: { type: "string" } },
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
          if (toolName === "read") {
            const p = String(params.path || "");
            const lines = Array.from({ length: 20 }, (_, i) => `${p}:line${i + 1}: content of ${p}`);
            return { content: [{ type: "text", text: lines.join("\n") }] };
          }
          if (toolName === "grep") {
            const pattern = String(params.pattern || "");
            return {
              content: [{ type: "text", text: JSON.stringify([
                { path: "src/a.ts", line: 10, text: `match: ${pattern}` },
                { path: "src/b.ts", line: 25, text: `match: ${pattern}` },
              ]) }],
              details: {
                ptcValue: {
                  kind: "grep",
                  matches: [
                    { path: "src/a.ts", line: 10, anchor: "10:aa", text: `match: ${pattern}` },
                    { path: "src/b.ts", line: 25, anchor: "25:bb", text: `match: ${pattern}` },
                  ],
                },
              },
            };
          }
          if (toolName === "search_tool") {
            return {
              content: [{ type: "text", text: `results for ${params.query}` }],
              details: {
                ptcValue: {
                  kind: "search_results",
                  responseId: "resp_search_001",
                  query: params.query,
                  results: [
                    { id: "r1", title: "First result", score: 0.95 },
                    { id: "r2", title: "Second result", score: 0.82 },
                  ],
                },
              },
            };
          }
          if (toolName === "detail_tool") {
            return {
              content: [{ type: "text", text: `detail for ${params.id}` }],
              details: {
                ptcValue: {
                  kind: "detail",
                  id: params.id,
                  body: `Full details for ${params.id}: Lorem ipsum dolor sit amet.`,
                  metadata: { author: "test", date: "2026-03-26" },
                },
              },
            };
          }
          if (toolName === "failing_tool") {
            throw new Error(`intentional: ${params.msg}`);
          }
          throw new Error(`Unknown tool: ${toolName}`);
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
      executionTimeoutMs: 15_000,
      maxOutputChars,
      allowMutations: false,
      allowBash: false,
      maxParallelToolCalls: 6,
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
// COMPOSITION WORKFLOWS
// ═══════════════════════════════════════════

test("composition: search → inspect → summarize", async () => {
  const executor = createCompositionExecutor();
  const result = await exec(executor, [
    '# Step 1: Search for a pattern',
    'matches = await grep(pattern="TODO")',
    '# Step 2: Read matched files',
    'files = [m["path"] for m in matches.get("matches", [])] if isinstance(matches, dict) else []',
    'contents = await ptc.read_many(files) if files else [str(matches)]',
    '# Step 3: Summarize with bounded output',
    'summary = {"workflow": "search-inspect-summarize", "files_found": len(contents), "total_chars": sum(len(c) for c in contents)}',
    'return ptc.json_dump(ptc.fit_output(summary, max_chars=500))',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output", "Should produce fit_output wrapper");
});

test("composition: batch read → reduce → fit", async () => {
  const executor = createCompositionExecutor();
  const result = await exec(executor, [
    '# Step 1: Batch read 4 files',
    'calls = [{"tool": "read", "params": {"path": f"file-{i}.ts"}} for i in range(4)]',
    'results = await ptc.batch_tool(calls)',
    '# Step 2: Reduce to accumulate line counts',
    'line_counts = [len(str(r).split("\\n")) for r in results]',
    '# Step 3: Fit output',
    'return ptc.json_dump(ptc.fit_output({"workflow": "batch-reduce-fit", "files": 4, "line_counts": line_counts, "total": sum(line_counts)}, max_chars=300))',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output");
});

test("composition: introspection-gated branching", async () => {
  const executor = createCompositionExecutor();
  const result = await exec(executor, [
    '# Step 1: Check available tools',
    'tools = ptc.list_callable_tools()',
    'tool_names = [t["name"] for t in tools]',
    '# Step 2: Branch based on availability',
    'if "detail_tool" in tool_names:',
    '  r = await detail_tool(id="item-42")',
    '  branch = "detail"',
    'else:',
    '  r = await read(path="fallback.txt")',
    '  branch = "fallback"',
    '# Step 3: Return branching result',
    'return ptc.json_dump({"workflow": "introspection-branch", "branch": branch, "has_result": len(str(r)) > 0})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.branch, "detail", "Should take detail branch when tool is available");
  assert.equal(parsed.has_result, true);
});

test("composition: first-success fallback → fit", async () => {
  const executor = createCompositionExecutor();
  const result = await exec(executor, [
    '# Step 1: Try search_tool (fail), then grep (succeed)',
    'calls = [',
    '  {"tool": "failing_tool", "params": {"msg": "primary down"}},',
    '  {"tool": "grep", "params": {"pattern": "fallback-query"}},',
    ']',
    'r = await ptc.first_success(calls)',
    '# Step 2: Fit the result',
    'return ptc.json_dump(ptc.fit_output({"workflow": "fallback-fit", "result_type": str(type(r)), "has_data": len(str(r)) > 0}, max_chars=300))',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output");
});

test("composition: handle extraction workflow", async () => {
  const executor = createCompositionExecutor();
  const result = await exec(executor, [
    '# Step 1: Call search_tool (returns ptcValue with responseId)',
    'sr = await search_tool(query="audit test")',
    '# Step 2: Extract handles',
    'handles = ptc.extract_handles(sr)',
    '# Step 3: Get first response handle',
    'h = ptc.first_handle(sr, kind="response")',
    'return ptc.json_dump({"workflow": "handle-extraction", "handles_found": len(handles), "first_handle": h is not None, "result_kind": sr.get("kind", "?")})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.workflow, "handle-extraction");
  assert.equal(parsed.result_kind, "search_results");
});

test("composition: error-resilient pipeline with partial collection", async () => {
  const executor = createCompositionExecutor();
  const result = await exec(executor, [
    '# Step 1: Try batch with mixed success/failure — collect what we can',
    'results = []',
    'calls = [',
    '  {"tool": "read", "params": {"path": "ok-1.ts"}},',
    '  {"tool": "read", "params": {"path": "ok-2.ts"}},',
    ']',
    '# batch_tool fails fast, so run successful ones first',
    'good = await ptc.batch_tool(calls)',
    'results.extend([str(r)[:50] for r in good])',
    '# Step 2: Try a failing call separately',
    'try:',
    '  bad = await ptc.batch_tool([{"tool": "failing_tool", "params": {"msg": "expected"}}])',
    '  results.append("unexpected_success")',
    'except Exception as e:',
    '  results.append(f"caught:{str(e)[:30]}")',
    '# Step 3: Fit the collected results',
    'return ptc.json_dump(ptc.fit_output({"workflow": "error-resilient", "collected": len(results), "results": results}, max_chars=500))',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output");
});

test("composition: full pipeline — batch → gather → reduce → fit", async () => {
  const executor = createCompositionExecutor();
  const result = await exec(executor, [
    '# Step 1: Batch tool calls',
    'batch_calls = [{"tool": "read", "params": {"path": f"src/{i}.ts"}} for i in range(3)]',
    'batch_results = await ptc.batch_tool(batch_calls)',
    '# Step 2: Gather additional coroutines with limit',
    'extra = await ptc.gather_limit([read(path="extra-1.ts"), read(path="extra-2.ts")], limit=2)',
    '# Step 3: Combine all results',
    'all_results = list(batch_results) + list(extra)',
    'lengths = [len(str(r)) for r in all_results]',
    '# Step 4: Fit to bounded output',
    'final = ptc.fit_output({',
    '  "workflow": "full-pipeline",',
    '  "batch_count": len(batch_results),',
    '  "extra_count": len(extra),',
    '  "total": len(all_results),',
    '  "lengths": lengths,',
    '  "combined_chars": sum(lengths)',
    '}, max_chars=400)',
    'return ptc.json_dump(final)',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "fit_output");
});
