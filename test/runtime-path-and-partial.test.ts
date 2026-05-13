import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { CodeExecutor } from "../dist/code-executor.js";

/**
 * Phase 56 — Result Normalization and Partial-Error Semantics.
 *
 * Covers:
 *   - AC-1/AC-2: direct `read()` and `ptc.read_text()`/`ptc.read_many()` produce
 *     workspace-relative `path` fields when the target is under the host
 *     workspace root, matching the existing grep normalization policy.
 *   - AC-3: `ptc.read_many(..., on_error="collect")` returns a typed
 *     `read_many_partial` envelope, and the default `list[str]` form replaces
 *     missing-file entries with a `[read_many error] ...` marker instead of
 *     leaking raw stack-flavored text.
 */

type ToolStub = {
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

function createPathAwareExecutor() {
  const workspace = mkdtempSync(path.join(tmpdir(), "ptc-path-norm-"));
  writeFileSync(path.join(workspace, "file-a.txt"), "alpha\nbeta\n", "utf8");
  writeFileSync(path.join(workspace, "file-b.txt"), "gamma\ndelta\n", "utf8");

  const tools: ToolStub[] = [
    {
      name: "read",
      description: "Read a file",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          offset: { type: "integer" },
          limit: { type: "integer" },
        },
        required: ["path"],
        additionalProperties: false,
      },
      source: "builtin",
      isReadOnly: true,
    },
  ];

  const toolRegistry = {
    createCallableToolRuntime() {
      return {
        tools,
        runTool: async (toolName: string, params: Record<string, unknown>) => {
          if (toolName !== "read") {
            throw new Error(`Unexpected tool: ${toolName}`);
          }
          const requested = String(params.path || "");
          const absolute = path.isAbsolute(requested)
            ? requested
            : path.join(workspace, requested);
          const isUnderWorkspace = absolute.startsWith(workspace + path.sep) || absolute === workspace;
          if (!isUnderWorkspace && requested !== "OUTSIDE.txt") {
            // Existence check using the workspace mapping.
            try {
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              const fs = require("node:fs");
              fs.statSync(absolute);
            } catch {
              throw new Error(`File not found: ${requested}`);
            }
          }
          if (requested === "MISSING.txt") {
            throw new Error(`File not found: ${requested}`);
          }
          if (requested === "OUTSIDE.txt") {
            // Simulate an out-of-workspace absolute path the runtime should
            // preserve as-is.
            const outsideAbs = "/var/external/out.txt";
            return {
              content: [{ type: "text", text: "external" }],
              details: {
                ptcValue: {
                  tool: "read",
                  path: outsideAbs,
                  range: { startLine: 1, endLine: 1, totalLines: 1 },
                  warnings: [],
                  truncation: null,
                  symbol: null,
                  map: { requested: false, appended: false },
                  lines: [{ line: 1, hash: "0", anchor: "1:0", raw: "external", display: "external" }],
                },
              },
            };
          }
          // Normal case: emit a ReadResult-shaped ptcValue with an ABSOLUTE
          // host path under the workspace root, which the runtime adapter
          // must normalize to a relative path before handing it to Python.
          return {
            content: [{ type: "text", text: "alpha\nbeta\n" }],
            details: {
              ptcValue: {
                tool: "read",
                path: absolute,
                range: { startLine: 1, endLine: 2, totalLines: 2 },
                warnings: [],
                truncation: null,
                symbol: null,
                map: { requested: false, appended: false },
                lines: [
                  { line: 1, hash: "a1", anchor: "1:a1", raw: "alpha", display: "alpha" },
                  { line: 2, hash: "b2", anchor: "2:b2", raw: "beta", display: "beta" },
                ],
              },
            },
          };
        },
      };
    },
  };

  const sandboxManager = {
    spawn(code: string, cwd: string) {
      return spawn("python3", ["-u", "-c", code], { cwd, env: { ...process.env } });
    },
    getRuntimeWorkspaceRoot(cwd: string) {
      return cwd;
    },
    async cleanup() {},
  };

  const executor = new CodeExecutor(
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

  (executor as any).__workspace = workspace;
  return executor;
}

const exec = (executor: any, code: string) => {
  const cwd = (executor as any).__workspace || process.cwd();
  return executor.execute(code, { cwd, ctx: { cwd } as any });
};

test("AC-1: direct read() normalizes structured path to workspace-relative", async () => {
  const executor = createPathAwareExecutor();
  const result = await exec(executor, [
    'r = await read(path="file-a.txt")',
    'return ptc.json_dump({"path": r["path"], "first_line_path": r["lines"][0].get("path", None)})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.path, "file-a.txt", `read() ReadResult.path should be workspace-relative, got: ${parsed.path}`);
});

test("AC-1: ptc.read_text() preserves string return (smoke for read-pipeline path policy)", async () => {
  const executor = createPathAwareExecutor();
  const result = await exec(executor, [
    'r = await ptc.read_text("file-a.txt")',
    'return ptc.json_dump({"is_str": isinstance(r, str), "len": len(r)})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.is_str, true);
  assert.ok(parsed.len > 0);
});

test("AC-1: out-of-workspace absolute path is preserved as absolute", async () => {
  const executor = createPathAwareExecutor();
  const result = await exec(executor, [
    'r = await read(path="OUTSIDE.txt")',
    'return ptc.json_dump({"path": r["path"]})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.path, "/var/external/out.txt", `out-of-workspace path should remain absolute, got: ${parsed.path}`);
});

test("AC-3: ptc.read_many default form replaces missing entry with bounded error marker", async () => {
  const executor = createPathAwareExecutor();
  const result = await exec(executor, [
    'r = await ptc.read_many(["file-a.txt", "MISSING.txt", "file-b.txt"])',
    'return ptc.json_dump({',
    '  "is_list": isinstance(r, list),',
    '  "count": len(r),',
    '  "missing_marker": r[1].startswith("[read_many error]") if isinstance(r[1], str) else False,',
    '  "ok_lens": [len(r[0]), len(r[2])],',
    '})',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.is_list, true);
  assert.equal(parsed.count, 3);
  assert.equal(parsed.missing_marker, true, "missing read_many entry should start with [read_many error] marker");
  assert.ok(parsed.ok_lens[0] > 0);
  assert.ok(parsed.ok_lens[1] > 0);
});

test("AC-3: ptc.read_many(on_error='collect') returns typed partial envelope", async () => {
  const executor = createPathAwareExecutor();
  const result = await exec(executor, [
    'r = await ptc.read_many(["file-a.txt", "MISSING.txt"], on_error="collect")',
    'return ptc.json_dump(r)',
  ].join("\n"));
  const parsed = JSON.parse(result.output);
  assert.equal(parsed.kind, "read_many_partial");
  assert.deepEqual(parsed.stats, { total: 2, succeeded: 1, failed: 1 });
  assert.equal(parsed.results[0].ok, true);
  assert.equal(parsed.results[0].path, "file-a.txt");
  assert.equal(typeof parsed.results[0].value, "string");
  assert.equal(parsed.results[1].ok, false);
  assert.equal(parsed.results[1].path, "MISSING.txt");
  assert.equal(typeof parsed.results[1].error, "string");
  assert.ok(parsed.results[1].error.length > 0);
});
