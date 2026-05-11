import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { CodeExecutor } from "../dist/code-executor.js";
// PtcPythonError imported for reference — syntax errors surface as RPC close, not PtcPythonError

/**
 * Live audit: pipeline mechanics — RPC bridge, ptcValue passthrough,
 * error boundaries, and recovery paths.
 */

function createPipelineExecutor(maxOutputChars = 4_000) {
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
      name: "structured_tool",
      description: "Returns a structured ptcValue payload",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
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
            return {
              content: [{ type: "text", text: "file content here" }],
            };
          }
          if (toolName === "structured_tool") {
            return {
              content: [{ type: "text", text: JSON.stringify({ query: params.query }) }],
              details: {
                ptcValue: {
                  kind: "structured_result",
                  query: params.query,
                  score: 0.95,
                  items: ["a", "b", "c"],
                },
              },
            };
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
    process.cwd()
  );
}

const exec = (executor: any, code: string) =>
  executor.execute(code, { cwd: process.cwd(), ctx: { cwd: process.cwd() } as any });

// ═══════════════════════════════════════════
// RPC ROUND-TRIP
// ═══════════════════════════════════════════

test("pipeline: RPC round-trip — submit Python, get result back", async () => {
  const executor = createPipelineExecutor();
  const result = await exec(executor, 'return "hello from python"');
  assert.equal(result.output, "hello from python");
});

test("pipeline: RPC round-trip — tool call and return", async () => {
  const executor = createPipelineExecutor();
  const result = await exec(executor, 'r = await read(path="package.json")\nreturn "got:" + str(len(str(r)) > 0)');
  assert.ok(result.output.includes("got:True"), `RPC tool call should work, got: ${result.output}`);
});

// ═══════════════════════════════════════════
// STRUCTURED ptcValue PASSTHROUGH
// ═══════════════════════════════════════════

test("pipeline: ptcValue structured payload passes through RPC", async () => {
  const executor = createPipelineExecutor();
  const result = await exec(executor, [
    'r = await structured_tool(query="test")',
    'return ptc.json_dump({"kind": r.get("kind", "?"), "score": r.get("score", 0), "item_count": len(r.get("items", []))})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "structured_result", "ptcValue kind should pass through");
  assert.equal(parsed.score, 0.95, "ptcValue score should pass through");
  assert.equal(parsed.item_count, 3, "ptcValue items should pass through");
});

// ═══════════════════════════════════════════
// ERROR BOUNDARIES
// ═══════════════════════════════════════════

test("pipeline: syntax error surfaces actionable Python context", async () => {
  const executor = createPipelineExecutor();
  await assert.rejects(
    exec(executor, "def broken(\nreturn 1"),
    (err: any) => {
      const hasActionableSyntaxContext =
        err.message.includes("SyntaxError") || err.message.includes("Traceback");
      assert.ok(hasActionableSyntaxContext, `Expected SyntaxError/Traceback context, got: ${err.message}`);
      assert.ok(
        !err.message.includes("stdout closed before a terminal protocol message") &&
          !err.message.includes("RPC stdout closed"),
        `Should not fall back to generic transport-close messaging, got: ${err.message}`
      );
      return true;
    }
  );
});

test("pipeline: runtime exception is surfaced", async () => {
  const executor = createPipelineExecutor();
  await assert.rejects(
    exec(executor, 'raise ValueError("intentional test error")'),
    (err: any) => {
      assert.ok(err.message.includes("intentional test error"),
        `Should surface the error message, got: ${err.message}`);
      return true;
    }
  );
});

test("pipeline: division by zero is caught", async () => {
  const executor = createPipelineExecutor();
  await assert.rejects(
    exec(executor, "x = 1 / 0\nreturn x"),
    (err: any) => {
      assert.ok(err.message.includes("division by zero") || err.message.includes("ZeroDivision"),
        `Should catch division by zero, got: ${err.message}`);
      return true;
    }
  );
});

// ═══════════════════════════════════════════
// OUTPUT BOUNDARY
// ═══════════════════════════════════════════

test("pipeline: output exceeding maxOutputChars is bounded", async () => {
  const executor = createPipelineExecutor(200);
  const result = await exec(executor, 'return "x" * 5000');
  assert.ok(result.output.length <= 200, `Output should respect maxOutputChars exactly, got: ${result.output.length}`);
  assert.match(result.output, /Output truncated/, "Bounded output should include truncation notice when room allows");
});

// ═══════════════════════════════════════════
// asyncio.run() REJECTION
// ═══════════════════════════════════════════

test("pipeline: asyncio.run() is rejected before execution", async () => {
  const executor = createPipelineExecutor();
  await assert.rejects(
    exec(executor, "import asyncio\nasyncio.run(main())"),
    /Top-level await is already available/,
    "asyncio.run() should be rejected"
  );
});
