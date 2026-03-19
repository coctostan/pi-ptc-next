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
function assertSgAvailable() {
  try {
    execFileSync("sg", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error("hashline sg contract test requires ast-grep (`sg`) on PATH.");
  }
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
function loadSgPayload() {
  assertSgAvailable();
  const repoRoot = resolveHashlineRepoRoot();
  const tempDir = mkdtempSync(path.join(tmpdir(), "hashline-sg-fixture-"));
  const filePath = path.join(tempDir, "demo.ts");
  writeFileSync(
    filePath,
    [
      "function demoTarget() {",
      '  const value = "before";',
      "  return value;",
      "}",
      "",
      "demoTarget();",
    ].join("\n"),
    "utf8"
  );
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
        `import { registerSgTool } from "./src/sg.ts";
let tool;
registerSgTool({ registerTool(def) { tool = def; } });
const result = await tool.execute("tc", { pattern: "const $NAME = $VALUE;", lang: "typescript", path: "demo.ts" }, new AbortController().signal, () => {}, { cwd: ${JSON.stringify(tempDir)} });
console.log(JSON.stringify(result.details.ptcValue));`,
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );
    return JSON.parse(stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(tempDir, { recursive: true, force: true });
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

function normalizeSgForDocs(payload) {
  return {
    ...payload,
    files: payload.files.map((file) => ({
      ...file,
      path: path.basename(file.path),
    })),
  };
}

test("sg live payload shape and TypedDict coverage stay aligned", () => {
  const payload = loadSgPayload();
  const wrapperCode = generateToolWrappers([]);
  assert.ok(payload.files.length > 0);
  assert.ok(payload.files.every((file) => "path" in file && "ranges" in file && "lines" in file));
  assert.ok(payload.files[0].ranges.every((range) => "startLine" in range && "endLine" in range));
  assert.ok(payload.files[0].lines.every((line) => ["line", "hash", "anchor", "raw", "display"].every((key) => key in line)));
  assert.match(wrapperCode, /class SgRange\(TypedDict\):/);
  assert.match(wrapperCode, /class SgFile\(TypedDict\):/);
  assert.match(wrapperCode, /class SgResult\(TypedDict\):/);
  assert.match(wrapperCode, /ranges: List\[SgRange\]/);
  assert.match(wrapperCode, /lines: List\[HashlineLine\]/);
  assert.match(wrapperCode, /files: List\[SgFile\]/);
  assert.match(wrapperCode, /startLine: int/);
  assert.match(wrapperCode, /endLine: int/);
  assert.match(wrapperCode, /path: str/);
  assert.match(wrapperCode, /tool: str/);
});

test("README sg example exactly matches the normalized live payload", () => {
  const payload = loadSgPayload();
  const readme = readFileSync(path.resolve(__dirname, "../README.md"), "utf8");
  const expectedSgExample = normalizeSgForDocs(payload);
  const sgExample = extractJsonExample(readme, "sg");
  assert.match(readme, /sg\(pattern, \*, lang=None, path=None\) -> SgResult/);
  assert.deepEqual(sgExample, expectedSgExample);
});
