import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  buildBenchmarkResultRecord,
  compareBenchmarkRuns,
  createDeterministicBenchmarkExecutor,
  getDefaultBenchmarkResultPath,
  getProviderModelSlug,
  resolveBenchmarkEvalsPath,
  readBenchmarkRun,
  runBenchmarkCli,
  runBenchmarkSuite,
  writeBenchmarkRun,
} from "../dist/benchmark-runner.js";

type EvalCaseLike = {
  id: string;
  expected_first_path: "code_execution" | "direct";
};

type RecipeTargetShape = {
  workflow: string;
  repos: string[];
  output_contract: {
    max_items: number;
  };
};
type BenchmarkRunShape = Parameters<typeof writeBenchmarkRun>[1];

const seededEvalsPath = path.resolve(process.cwd(), ".pi", "evals", "ptc");
const seededRecipeCaseIds = [
  "recipe-codegraph-web-evidence-merge",
  "recipe-graph-compact-ranking",
  "recipe-hashline-anomaly-summary",
  "recipe-web-answer-comparison",
] as const;
const seededRecipeBaselinePath = path.join(seededEvalsPath, "baselines", "local__seeded__recipes.json");

function makeTempDir() {
  return mkdtempSync(path.join(tmpdir(), "ptc-benchmark-"));
}

test("buildBenchmarkResultRecord preserves required benchmark result fields", () => {
  const record = buildBenchmarkResultRecord(
    {
      id: "recovery-missing-await",
      prompt: "Use Python to read package.json and return compact JSON only.",
      expected_first_path: "code_execution",
      acceptance: {
        type: "behavioral",
        rules: [
          "observed_first_path=code_execution",
          "recovery_attempted=true",
          "failure_class=missing-await",
          "success=true",
        ],
      },
      recipe_target: {
        repos: ["pi-codegraph"],
        workflow: "graph-compact-ranking",
        summary: "Analyze many graph results and return a compact ranking.",
        output_contract: {
          format: "json",
          style: "compact-ranking",
          focus: "Return only the top ranked symbols with compact impact evidence.",
          max_items: 5,
          max_chars: 1200,
        },
      },
    },
    "local",
    "seeded",
    {
      observed_first_path: "code_execution",
      recovery_attempted: true,
      failure_class: "missing-await",
      total_tokens: 12,
      duration_ms: 34,
      output: '{"ok":true}',
    }
  );

  assert.deepEqual(record.result, {
    case_id: "recovery-missing-await",
    provider: "local",
    model: "seeded",
    expected_first_path: "code_execution",
    observed_first_path: "code_execution",
    success: true,
    recovery_attempted: true,
    failure_class: "missing-await",
    total_tokens: 12,
    duration_ms: 34,
  });
  assert.deepEqual(record.recipe_target, {
    repos: ["pi-codegraph"],
    workflow: "graph-compact-ranking",
    summary: "Analyze many graph results and return a compact ranking.",
    output_contract: {
      format: "json",
      style: "compact-ranking",
      focus: "Return only the top ranked symbols with compact impact evidence.",
      max_items: 5,
      max_chars: 1200,
    },
  });
});

test("runBenchmarkSuite executes a seeded eval subset and returns deterministic JSON-ready results", async () => {
  const run = await runBenchmarkSuite({
    provider: "local",
    model: "seeded",
    evalsPath: seededEvalsPath,
    caseIds: ["ptc-positive-multi-file-aggregation", "recovery-missing-await"],
    timestamp: "2026-03-16T00:00:00.000Z",
    executor: async (evalCase: EvalCaseLike) => ({
      observed_first_path: evalCase.expected_first_path,
      recovery_attempted: evalCase.id === "recovery-missing-await",
      failure_class: evalCase.id === "recovery-missing-await" ? "missing-await" : null,
      total_tokens: 21,
      duration_ms: 8,
      output: '{"ok":true}',
    }),
  });

  assert.equal(run.provider, "local");
  assert.equal(run.model, "seeded");
  assert.equal(run.generated_at, "2026-03-16T00:00:00.000Z");
  assert.equal(run.summary.total_cases, 2);
  assert.equal(run.summary.successful_cases, 2);
  assert.equal(run.summary.recovery_attempts, 1);
  assert.equal(JSON.parse(JSON.stringify(run)).results.length, 2);
  assert.equal(run.results[1].result.failure_class, "missing-await");
});

test("runBenchmarkSuite preserves recipe-target metadata for seeded M4 recipe cases", async () => {
  const run = await runBenchmarkSuite({
    provider: "local",
    model: "seeded",
    evalsPath: seededEvalsPath,
    caseIds: ["recipe-codegraph-web-evidence-merge", "recipe-graph-compact-ranking"],
    timestamp: "2026-03-26T00:00:00.000Z",
    executor: async (evalCase: EvalCaseLike) => ({
      observed_first_path: evalCase.expected_first_path,
      total_tokens: 34,
      duration_ms: 9,
      output: JSON.stringify({ id: evalCase.id }),
    }),
  });

  assert.equal(run.summary.total_cases, 2);
  assert.deepEqual(
    run.results.map((record: { recipe_target?: RecipeTargetShape }) => record.recipe_target?.workflow),
    ["codegraph-web-evidence-merge", "graph-compact-ranking"]
  );
  assert.deepEqual(run.results[0].recipe_target?.repos, ["pi-codegraph", "pi-web-tools"]);
  assert.equal(run.results[1].recipe_target?.output_contract.max_items, 5);
});

test("seeded recipe baseline fixture matches deterministic recipe-only benchmark output", async () => {
  const baseline = readBenchmarkRun(seededRecipeBaselinePath);
  const generated = await runBenchmarkSuite({
    provider: "local",
    model: "seeded",
    evalsPath: seededEvalsPath,
    caseIds: [...seededRecipeCaseIds],
    timestamp: baseline.generated_at,
  });

  assert.deepEqual(baseline, generated);
  assert.equal(baseline.summary.total_cases, seededRecipeCaseIds.length);
  assert.deepEqual(
    baseline.results.map((record: { result: { case_id: string } }) => record.result.case_id),
    [...seededRecipeCaseIds]
  );
});

test("seeded recipe baseline fixture stays comparable through benchmark runner helpers", async () => {
  const baseline = readBenchmarkRun(seededRecipeBaselinePath);
  const rerun = await runBenchmarkSuite({
    provider: "local",
    model: "seeded",
    evalsPath: seededEvalsPath,
    caseIds: [...seededRecipeCaseIds],
    timestamp: baseline.generated_at,
    baselinePath: seededRecipeBaselinePath,
  });

  assert.deepEqual(rerun.comparison, {
    baseline_path: seededRecipeBaselinePath,
    regressions: [],
  });

  const tempDir = makeTempDir();
  const writtenPath = path.join(tempDir, "recipe-results.json");
  writeBenchmarkRun(writtenPath, rerun);

  assert.deepEqual(readBenchmarkRun(writtenPath), rerun);
});

test("compareBenchmarkRuns reports routing and recovery regressions deterministically", () => {
  const baseline: BenchmarkRunShape = {
    provider: "local",
    model: "seeded",
    generated_at: "2026-03-16T00:00:00.000Z",
    results: [
      {
        result: {
          case_id: "recovery-missing-await",
          provider: "local",
          model: "seeded",
          expected_first_path: "code_execution",
          observed_first_path: "code_execution",
          success: true,
          recovery_attempted: true,
          failure_class: "missing-await",
          total_tokens: 11,
          duration_ms: 7,
        },
        rule_outcomes: [],
      },
    ],
    summary: {
      total_cases: 1,
      successful_cases: 1,
      routed_cases: 1,
      recovery_attempts: 1,
    },
  };
  const current: BenchmarkRunShape = {
    provider: "local",
    model: "seeded",
    generated_at: "2026-03-16T00:00:01.000Z",
    results: [
      {
        result: {
          case_id: "recovery-missing-await",
          provider: "local",
          model: "seeded",
          expected_first_path: "code_execution",
          observed_first_path: "direct",
          success: false,
          recovery_attempted: false,
          failure_class: null,
          total_tokens: 9,
          duration_ms: 6,
        },
        rule_outcomes: [],
      },
    ],
    summary: {
      total_cases: 1,
      successful_cases: 0,
      routed_cases: 0,
      recovery_attempts: 0,
    },
  };

  const comparison = compareBenchmarkRuns(current, baseline, "/tmp/baseline.json");

  assert.deepEqual(comparison, {
    baseline_path: "/tmp/baseline.json",
    regressions: [
      {
        case_id: "recovery-missing-await",
        kind: "routing",
        message: "routing regressed from code_execution to direct",
      },
      {
        case_id: "recovery-missing-await",
        kind: "recovery",
        message: "recovery no longer triggers for a previously recovered case",
      },
      {
        case_id: "recovery-missing-await",
        kind: "recovery",
        message: "failure class regressed from missing-await to null",
      },
      {
        case_id: "recovery-missing-await",
        kind: "success",
        message: "case no longer satisfies acceptance rules",
      },
    ],
  });
});

test("runBenchmarkCli writes a result file and emits comparison output for a seeded subset", async () => {
  const tempDir = makeTempDir();
  const evalsPath = path.join(tempDir, "evals");
  const resultsPath = path.join(tempDir, "results.json");
  const baselinePath = path.join(tempDir, "baseline.json");

  mkdirSync(path.join(evalsPath, "cases"), { recursive: true });
  writeFileSync(
    path.join(evalsPath, "cases", "case.json"),
    JSON.stringify(
      {
        id: "ptc-positive-multi-file-aggregation",
        prompt: "Find the top 5 most imported packages across all TypeScript files in src and return compact JSON only.",
        expected_first_path: "code_execution",
        acceptance: {
          type: "behavioral",
          rules: ["observed_first_path=code_execution", "success=true", "output_json=true"],
        },
      },
      null,
      2
    )
  );

  const baselineRun: BenchmarkRunShape = {
    provider: "local",
    model: "seeded",
    generated_at: "2026-03-16T00:00:00.000Z",
    results: [
      {
        result: {
          case_id: "ptc-positive-multi-file-aggregation",
          provider: "local",
          model: "seeded",
          expected_first_path: "code_execution",
          observed_first_path: "direct",
          success: false,
          recovery_attempted: false,
          failure_class: null,
          total_tokens: 5,
          duration_ms: 5,
        },
        rule_outcomes: [],
      },
    ],
    summary: {
      total_cases: 1,
      successful_cases: 0,
      routed_cases: 0,
      recovery_attempts: 0,
    },
  };
  writeBenchmarkRun(baselinePath, baselineRun);

  const originalWrite = process.stdout.write;
  let stdout = "";
  process.stdout.write = (((chunk: string | Uint8Array<ArrayBufferLike>, ...args: unknown[]) => {
    stdout += String(chunk);
    const maybeCallback = args[args.length - 1];
    if (typeof maybeCallback === "function") {
      maybeCallback();
    }
    return true;
  }) as typeof process.stdout.write);

  try {
    await runBenchmarkCli([
      "--provider",
      "local",
      "--model",
      "seeded",
      "--evals-path",
      evalsPath,
      "--baseline",
      baselinePath,
      "--results-path",
      resultsPath,
      "--timestamp",
      "2026-03-16T00:00:00.000Z",
    ]);
  } finally {
    process.stdout.write = originalWrite;
  }

  const writtenRun = JSON.parse(readFileSync(resultsPath, "utf8"));
  const emitted = JSON.parse(stdout.trim());

  assert.equal(writtenRun.results.length, 1);
  assert.equal(writtenRun.results[0].result.case_id, "ptc-positive-multi-file-aggregation");
  assert.equal(writtenRun.comparison.regressions.length, 0);
  assert.deepEqual(emitted, {
    results_path: resultsPath,
    summary: writtenRun.summary,
    comparison: writtenRun.comparison,
  });
});

test("benchmark helper paths stay under the eval root", () => {
  const evalsPath = resolveBenchmarkEvalsPath("/repo", ".pi/evals/ptc");

  assert.equal(evalsPath, path.join("/repo", ".pi", "evals", "ptc"));
  assert.equal(getProviderModelSlug("OpenAI", "gpt-5.4-mini"), "openai__gpt-5.4-mini");
  assert.equal(
    getDefaultBenchmarkResultPath(evalsPath, "OpenAI", "gpt-5.4-mini", "2026-03-16T00:00:00.000Z"),
    path.join(evalsPath, "results", "openai__gpt-5.4-mini", "2026-03-16T00:00:00.000Z.json")
  );
});

test("deterministic benchmark executor derives recovery hints from eval rules", async () => {
  const executor = createDeterministicBenchmarkExecutor();
  const observation = await executor(
    {
      id: "recovery-async-wrapper-iterated",
      prompt: "Count imports across src/**/*.ts and return compact JSON only.",
      expected_first_path: "code_execution",
      acceptance: {
        type: "behavioral",
        rules: [
          "observed_first_path=code_execution",
          "recovery_attempted=true",
          "failure_class=async-wrapper-iterated",
          "output_json=true",
        ],
      },
    },
    { provider: "local", model: "seeded" }
  );

  assert.equal(observation.observed_first_path, "code_execution");
  assert.equal(observation.recovery_attempted, true);
  assert.equal(observation.failure_class, "async-wrapper-iterated");
  const output = observation.output;
  if (typeof output !== "string") {
    assert.fail("expected deterministic benchmark executor to return JSON output");
  }
  assert.deepEqual(JSON.parse(output), {
    case_id: "recovery-async-wrapper-iterated",
    provider: "local",
    model: "seeded",
  });
});
