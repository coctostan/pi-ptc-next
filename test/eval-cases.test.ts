import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseEvalCase, validateEvalCase } from "../dist/eval-cases.js";

const casesDir = path.resolve(process.cwd(), ".pi", "evals", "ptc", "cases");
const requiredCaseFiles = [
  "ptc-positive-multi-file-aggregation.json",
  "ptc-positive-repo-count-ranking.json",
  "direct-negative-single-file-read.json",
  "direct-negative-mutation-fix.json",
  "recovery-missing-await.json",
  "recovery-async-wrapper-iterated.json",
  "recipe-codegraph-web-evidence-merge.json",
  "recipe-graph-compact-ranking.json",
  "recipe-hashline-anomaly-summary.json",
  "recipe-web-answer-comparison.json",
] as const;
const recipeCaseFiles = [
  "recipe-codegraph-web-evidence-merge.json",
  "recipe-graph-compact-ranking.json",
  "recipe-hashline-anomaly-summary.json",
  "recipe-web-answer-comparison.json",
] as const;
const recipeArtifactsDir = path.resolve(process.cwd(), ".pi", "evals", "ptc", "recipes");

function readCase(fileName: string) {
  return JSON.parse(readFileSync(path.join(casesDir, fileName), "utf8"));
}

function readRecipeArtifact(workflow: string) {
  return readFileSync(path.join(recipeArtifactsDir, `${workflow}.py`), "utf8");
}

test("seeded PTC eval case files exist for routing, recovery, and recipe buckets", () => {
  const caseFiles = new Set(readdirSync(casesDir).filter((entry) => entry.endsWith(".json")));

  assert.deepEqual([...caseFiles].sort(), [...requiredCaseFiles].sort());
});

test("seeded PTC eval case files validate against the deterministic schema", () => {
  for (const fileName of requiredCaseFiles) {
    const parsed = parseEvalCase(readCase(fileName), fileName);

    assert.equal(parsed.id.length > 0, true);
    assert.equal(parsed.prompt.length > 0, true);
    assert.equal(parsed.acceptance.rules.length > 0, true);
  }
});

test("seeded recipe cases expose compact recipe-target metadata for M4 workflows", () => {
  for (const fileName of recipeCaseFiles) {
    const parsed = parseEvalCase(readCase(fileName), fileName);

    assert.ok(parsed.recipe_target);
    assert.equal(parsed.recipe_target.repos.length > 0, true);
    assert.equal(parsed.recipe_target.workflow.length > 0, true);
    assert.equal(parsed.recipe_target.output_contract.format, "json");
    assert.equal(parsed.recipe_target.output_contract.max_items > 0, true);
  }
});

test("seeded recipe cases map workflow metadata to concrete internal recipe artifacts", () => {
  for (const fileName of recipeCaseFiles) {
    const parsed = parseEvalCase(readCase(fileName), fileName);

    assert.ok(parsed.recipe_target);
    const workflow = parsed.recipe_target.workflow;
    const artifactPath = path.join(recipeArtifactsDir, `${workflow}.py`);

    assert.equal(path.basename(artifactPath, ".py"), workflow);
    assert.equal(existsSync(artifactPath), true);
  }
});

test("seeded recipe artifacts use bounded helper patterns before the final compact return", () => {
  for (const fileName of recipeCaseFiles) {
    const parsed = parseEvalCase(readCase(fileName), fileName);

    assert.ok(parsed.recipe_target);
    const artifact = readRecipeArtifact(parsed.recipe_target.workflow);

    assert.match(artifact, /return ptc\.fit_output\(/);
    assert.match(artifact, /ptc\.(batch_tool|reduce_tool|first_success|extract_handles|first_handle|list_callable_tools)\(/);
    assert.doesNotMatch(artifact, /asyncio\.run\(/);
    assert.doesNotMatch(artifact, /_rpc_call\(/);
  }
});

test("validateEvalCase rejects malformed cases deterministically", () => {
  const errors = validateEvalCase({
    prompt: "   ",
    expected_first_path: "none",
    acceptance: {
      type: "approximate",
      rules: ["", 3],
    },
  });

  assert.deepEqual(errors, [
    "id must be a non-empty string",
    "prompt must be a non-empty string",
    'expected_first_path must be "code_execution" or "direct"',
    'acceptance.type must be "exact", "structural", or "behavioral"',
    "acceptance.rules[0] must be a non-empty string",
    "acceptance.rules[1] must be a non-empty string",
  ]);
});

test("validateEvalCase rejects malformed recipe-target metadata deterministically", () => {
  const errors = validateEvalCase({
    id: "recipe-broken",
    prompt: "Use Python to compare many URLs and return compact JSON only.",
    expected_first_path: "code_execution",
    acceptance: {
      type: "behavioral",
      rules: ["observed_first_path=code_execution", "success=true", "output_json=true"],
    },
    recipe_target: {
      repos: [],
      workflow: " ",
      summary: "",
      output_contract: {
        format: "",
        style: "compact",
        focus: "",
        max_items: 0,
        max_chars: -5,
      },
    },
  });

  assert.deepEqual(errors, [
    "recipe_target.repos must be a non-empty array of strings",
    "recipe_target.workflow must be a non-empty string",
    "recipe_target.summary must be a non-empty string",
    "recipe_target.output_contract.format must be a non-empty string",
    "recipe_target.output_contract.focus must be a non-empty string",
    "recipe_target.output_contract.max_items must be a positive integer",
    "recipe_target.output_contract.max_chars must be a positive integer when provided",
  ]);
});

test("parseEvalCase surfaces the source name in deterministic validation failures", () => {
  assert.throws(
    () => parseEvalCase({ id: "broken", prompt: "hi", expected_first_path: "direct", acceptance: {} }, "broken.json"),
    /broken\.json validation failed: acceptance.type must be "exact", "structural", or "behavioral"; acceptance.rules must be a non-empty array of strings/
  );
});
