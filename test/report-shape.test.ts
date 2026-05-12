import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { CodeExecutor } from "../dist/code-executor.js";
import { PtcPythonError } from "../dist/execution/execution-errors.js";

function createExecutor() {
  const workspace = mkdtempSync(path.join(tmpdir(), "ptc-report-"));
  const toolRegistry = {
    createCallableToolRuntime() {
      return {
        tools: [],
        runTool: async (toolName: string) => {
          throw new Error(`Unexpected tool call: ${toolName}`);
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
      executionTimeoutMs: 15_000,
      maxOutputChars: 8_000,
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

  return { executor, workspace };
}

async function exec(code: string) {
  const { executor, workspace } = createExecutor();
  return await executor.execute(code, { cwd: workspace, ctx: { cwd: workspace } as any });
}

test("ptc.report returns a canonical JSON-safe report and preserves structured details", async () => {
  const result = await exec(`
report = ptc.report(
    title="Repo summary",
    metrics={"files": 12, "healthy": True, "owner": "ptc", "notes": None},
    tables=[{"title": "Largest files", "columns": ["path", "lines"], "rows": [{"path": "src/index.ts", "lines": 523}]}],
    samples=[{"label": "example", "value": {"path": "README.md", "lines": [1, 2, 3]}}],
    warnings=["README is large"],
)
return report
`);

  const output = JSON.parse(result.output);
  assert.equal(output.kind, "ptc_report");
  assert.equal(output.version, 1);
  assert.equal(output.title, "Repo summary");
  assert.deepEqual(output.metrics, { files: 12, healthy: true, owner: "ptc", notes: null });
  assert.deepEqual(output.tables[0], {
    title: "Largest files",
    columns: ["path", "lines"],
    rows: [{ path: "src/index.ts", lines: 523 }],
  });
  assert.deepEqual(output.samples[0], { label: "example", value: { path: "README.md", lines: [1, 2, 3] } });
  assert.deepEqual(output.warnings, ["README is large"]);

  assert.equal(result.details.reportProduced, true);
  assert.deepEqual(result.details.report, output);
});

test("ptc.report rejects malformed report inputs with clear Python errors", async () => {
  await assert.rejects(
    exec('return ptc.report(title="", metrics={"bad": object()})'),
    (error) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.message, /title must be a non-empty string/i);
      return true;
    }
  );

  await assert.rejects(
    exec('return ptc.report(title="Bad", warnings=[123])'),
    (error) => {
      assert.ok(error instanceof PtcPythonError);
      assert.match(error.message, /warnings\[0\] must be a string/i);
      return true;
    }
  );
});

test("free-form returns and ptc.fit_output are not marked as reports", async () => {
  const plain = await exec('return {"kind": "not_a_report", "title": "Plain dict"}');
  assert.equal(plain.details.reportProduced, undefined);
  assert.equal(plain.details.report, undefined);
  assert.deepEqual(JSON.parse(plain.output), { kind: "not_a_report", title: "Plain dict" });

  const fit = await exec('return ptc.fit_output({"items": list(range(20))}, max_items=3)');
  const fitOutput = JSON.parse(fit.output);
  assert.equal(fitOutput.kind, "fit_output");
  assert.equal(fit.details.reportProduced, undefined);
  assert.equal(fit.details.report, undefined);
});
