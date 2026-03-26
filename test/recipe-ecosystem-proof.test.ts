import { describe, it } from "node:test";
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Recipe ecosystem composition proof.
 *
 * Validates that each adjacent-repo workflow type has a concrete recipe artifact
 * that composes through bounded PTC helpers without domain-specific imports.
 */

const RECIPE_DIR = join(process.cwd(), ".pi", "evals", "ptc", "recipes");
const BASELINE_PATH = join(
  process.cwd(),
  ".pi",
  "evals",
  "ptc",
  "baselines",
  "local__seeded__recipes.json",
);

const WORKFLOW_RECIPES: Record<string, string> = {
  graph: "graph-compact-ranking.py",
  web: "web-answer-comparison.py",
  hashline: "hashline-anomaly-summary.py",
  mixed: "codegraph-web-evidence-merge.py",
};

/** PTC helper patterns that recipes should compose through. */
const PTC_HELPER_PATTERNS = [
  "batch_tool",
  "first_success",
  "reduce_tool",
  "fit_output",
  "read_many",
  "gather_limit",
  "extract_handles",
  "first_handle",
  "read_tree",
  "expect_kind",
  "list_callable_tools",
  "get_tool_schema",
];

/**
 * Allowed import sources — standard library and PTC surface only.
 * Any import not matching these is flagged as domain-specific.
 */
const ALLOWED_IMPORT_PREFIXES = [
  "asyncio",
  "json",
  "os",
  "sys",
  "re",
  "collections",
  "typing",
  "pathlib",
  "functools",
  "itertools",
  "math",
  "datetime",
  "io",
  "abc",
  "dataclasses",
  "enum",
  "copy",
  "textwrap",
  "string",
];

describe("recipe ecosystem composition proof", () => {
  for (const [workflow, filename] of Object.entries(WORKFLOW_RECIPES)) {
    const recipePath = join(RECIPE_DIR, filename);

    it(`${workflow} workflow has a concrete recipe artifact`, () => {
      assert.ok(
        existsSync(recipePath),
        `Recipe artifact missing: ${recipePath}`,
      );
    });

    it(`${workflow} recipe uses bounded PTC helper patterns`, () => {
      const content = readFileSync(recipePath, "utf-8");
      const usedHelpers = PTC_HELPER_PATTERNS.filter((h) =>
        content.includes(h),
      );
      assert.ok(
        usedHelpers.length > 0,
        `${filename} does not reference any PTC helper patterns. Expected at least one of: ${PTC_HELPER_PATTERNS.join(", ")}`,
      );
    });

    it(`${workflow} recipe has no domain-specific imports`, () => {
      const content = readFileSync(recipePath, "utf-8");
      const importLines = content
        .split("\n")
        .filter(
          (line) =>
            /^\s*(import |from )/.test(line) && !line.trim().startsWith("#"),
        );

      const domainImports: string[] = [];
      for (const line of importLines) {
        const trimmed = line.trim();
        // Extract the module name from "import X" or "from X import ..."
        const match = trimmed.match(/^(?:import|from)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/);
        if (!match) continue;
        const moduleName = match[1].split(".")[0];

        // Skip if it's a PTC reference (ptc.* usage in the recipe body, not an import)
        if (moduleName === "ptc") continue;

        // Check against allowed standard library prefixes
        const isAllowed = ALLOWED_IMPORT_PREFIXES.some(
          (prefix) => moduleName === prefix,
        );
        if (!isAllowed) {
          domainImports.push(trimmed);
        }
      }

      assert.deepStrictEqual(
        domainImports,
        [],
        `${filename} has domain-specific imports: ${domainImports.join("; ")}`,
      );
    });
  }

  it("recipe-only benchmark baseline exists and covers all workflow types", () => {
    assert.ok(
      existsSync(BASELINE_PATH),
      `Baseline missing: ${BASELINE_PATH}`,
    );
    const baseline = JSON.parse(readFileSync(BASELINE_PATH, "utf-8"));
    const results = baseline.results || baseline;
    assert.ok(Array.isArray(results), "Baseline should contain a results array");
    // Each baseline entry has { result: { case_id, ... }, recipe_target: { workflow, ... } }
    const workflows = results.map(
      (r: Record<string, unknown>) =>
        ((r.recipe_target as Record<string, unknown>)?.workflow as string) || "",
    );
    // Match by recipe filename stem since baseline uses full workflow names (e.g., "codegraph-web-evidence-merge")
    for (const [label, filename] of Object.entries(WORKFLOW_RECIPES)) {
      const stem = filename.replace(/\.py$/, "");
      const found = workflows.some((w: string) => w === stem);
      assert.ok(
        found,
        `Baseline missing a result covering the "${label}" workflow (expected stem: ${stem}). Found: ${workflows.join(", ")}`,
      );
    }
  });
});
