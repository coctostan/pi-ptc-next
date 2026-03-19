const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require("node:fs");
const path = require("node:path");
const { tmpdir } = require("node:os");
const { generateToolWrappers } = require("../dist/tools/tool-wrapper.js");

function createTsLoader() {
  const dir = mkdtempSync(path.join(tmpdir(), "hashline-loader-"));
  const loaderPath = path.join(dir, "resolve-js-to-ts-loader.mjs");
  writeFileSync(
    loaderPath,
    `import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
function tryResolveAsTs(parentURL, specifier) {
  const parentPath = fileURLToPath(parentURL);
  const basePath = path.resolve(path.dirname(parentPath), specifier);
  if (basePath.endsWith(".js")) {
    const candidate = basePath.replace(/\\.js$/, ".ts");
    if (fs.existsSync(candidate)) return candidate;
  }
  if (!path.extname(basePath)) {
    const candidate = \`\${basePath}.ts\`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (err) {
    if (typeof specifier === "string" && (specifier.startsWith("./") || specifier.startsWith("../")) && context?.parentURL?.startsWith("file:")) {
      const candidate = tryResolveAsTs(context.parentURL, specifier);
      if (candidate) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    throw err;
  }
}
`,
    "utf8"
  );
  return { dir, loaderPath };
}

function resolveHashlineRepoRoot() {
  const candidates = [
    process.env.PI_HASHLINE_READMAP_ROOT ? path.resolve(process.env.PI_HASHLINE_READMAP_ROOT) : undefined,
    (() => {
      try {
        return path.dirname(require.resolve("pi-hashline-readmap"));
      } catch {
        return undefined;
      }
    })(),
    path.resolve(__dirname, "../../pi-hashline-readmap"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "index.ts")) || existsSync(path.join(candidate, "index.js"))) {
      return candidate;
    }
  }

  throw new Error(
    "Could not locate pi-hashline-readmap. Set PI_HASHLINE_READMAP_ROOT or install the package before running hashline contract tests."
  );
}

function loadGrepPayload() {
  const repoRoot = resolveHashlineRepoRoot();
  const { dir, loaderPath } = createTsLoader();
  try {
    const stdout = execFileSync(
      "node",
      [
        "--experimental-transform-types",
        "--loader",
        loaderPath,
        "--input-type=module",
        "-e",
        `import { registerGrepTool } from "./src/grep.ts";
let tool;
registerGrepTool({ registerTool(def) { tool = def; } });
const result = await tool.execute("tc", { pattern: "createDemoDirectory", path: "./tests/fixtures/small.ts", literal: true, context: 1 }, new AbortController().signal, () => {}, { cwd: process.cwd() });
console.log(JSON.stringify(result.details.ptcValue));`,
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );
    return JSON.parse(stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function extractJsonExample(readme, toolName) {
  const matches = [...readme.matchAll(/```json\n([\s\S]*?)\n```/g)];
  for (const [, block] of matches) {
    const parsed = JSON.parse(block);
    if (parsed && parsed.tool === toolName) {
      return parsed;
    }
  }
  throw new Error(`No JSON example found for ${toolName}`);
}

function normalizeGrepForDocs(repoRoot, payload) {
  return {
    ...payload,
    records: payload.records.map((record) => ({
      ...record,
      path: path.relative(repoRoot, record.path),
    })),
  };
}

test("grep live payload shape and TypedDict coverage stay aligned", () => {
  const payload = loadGrepPayload();
  const wrapperCode = generateToolWrappers([]);
  assert.equal(payload.tool, "grep");
  assert.equal(payload.summary, false);
  assert.equal(payload.totalMatches, 1);
  assert.ok(payload.records.every((record) => ["path", "line", "hash", "anchor", "kind", "raw", "display"].every((key) => key in record)));

  assert.match(wrapperCode, /class GrepMatch\(TypedDict, total=False\):/);
  assert.match(wrapperCode, /path: str/);
  assert.match(wrapperCode, /line: int/);
  assert.match(wrapperCode, /hash: str/);
  assert.match(wrapperCode, /anchor: str/);
  assert.match(wrapperCode, /kind: str/);
  assert.match(wrapperCode, /text: str/);
  assert.match(wrapperCode, /raw: str/);
  assert.match(wrapperCode, /display: str/);
  assert.match(wrapperCode, /class GrepResult\(TypedDict\):/);
  assert.match(wrapperCode, /tool: str/);
  assert.match(wrapperCode, /summary: bool/);
  assert.match(wrapperCode, /totalMatches: int/);
  assert.match(wrapperCode, /records: List\[GrepMatch\]/);
});

test("README grep example exactly matches the normalized live payload", () => {
  const repoRoot = resolveHashlineRepoRoot();
  const payload = loadGrepPayload();
  const readme = readFileSync(path.resolve(__dirname, "../README.md"), "utf8");
  const expectedGrepExample = normalizeGrepForDocs(repoRoot, payload);
  const grepExample = extractJsonExample(readme, "grep");
  assert.match(readme, /grep\(\.\.\.\) -> Union\[List\[GrepMatch\], GrepResult\]/);
  assert.deepEqual(grepExample, expectedGrepExample);
});
