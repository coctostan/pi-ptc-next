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
function loadEditPayload() {
  const repoRoot = resolveHashlineRepoRoot();
  const tempDir = mkdtempSync(path.join(tmpdir(), "hashline-edit-fixture-"));
  writeFileSync(path.join(tempDir, "sample.ts"), ["const one = 1;", "const two = 2;", "const three = 3;"].join("\n"), "utf8");
  const { dir, loaderPath } = createTsLoader();
  try {
    const script = `import { registerReadTool } from "./src/read.ts";
import { registerEditTool } from "./src/edit.ts";
let readTool;
let editTool;
registerReadTool({ registerTool(def) { if (def.name === "read") readTool = def; } });
registerEditTool({ registerTool(def) { if (def.name === "edit") editTool = def; } });
const readResult = await readTool.execute("read", { path: "sample.ts" }, new AbortController().signal, () => {}, { cwd: ${JSON.stringify(tempDir)} });
const anchor = readResult.details.ptcValue.lines[1].anchor;
const editResult = await editTool.execute("edit", { path: "sample.ts", edits: [{ set_line: { anchor, new_text: "const two = 22;" } }] }, new AbortController().signal, () => {}, { cwd: ${JSON.stringify(tempDir)} });
console.log(JSON.stringify(editResult.details.ptcValue));`;
    const stdout = execFileSync(
      "node",
      [
        "--experimental-transform-types",
        "--loader",
        loaderPath,
        "--input-type=module",
        "-e",
        script,
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

function normalizeEditForDocs(payload) {
  return {
    ...payload,
    path: path.basename(payload.path),
  };
}

test("edit live payload shape and TypedDict coverage stay aligned", () => {
  const payload = loadEditPayload();
  const wrapperCode = generateToolWrappers([]);
  assert.equal(payload.tool, "edit");
  assert.equal(payload.ok, true);
  assert.equal(payload.summary, "Updated sample.ts");
  assert.equal(payload.firstChangedLine, 2);
  assert.ok(Array.isArray(payload.warnings));
  assert.ok(Array.isArray(payload.noopEdits));
  assert.match(wrapperCode, /class AnchoredEditResult\(TypedDict, total=False\):/);
  assert.match(wrapperCode, /tool: str/);
  assert.match(wrapperCode, /path: str/);
  assert.match(wrapperCode, /summary: str/);
  assert.match(wrapperCode, /diff: str/);
  assert.match(wrapperCode, /firstChangedLine: Optional\[int\]/);
  assert.match(wrapperCode, /warnings: List\[str\]/);
  assert.match(wrapperCode, /noopEdits: List\[EditNoop\]/);
  assert.match(wrapperCode, /ok: bool/);
});

test("README edit example exactly matches the normalized live payload", () => {
  const payload = loadEditPayload();
  const readme = readFileSync(path.resolve(__dirname, "../README.md"), "utf8");
  const expectedEditExample = normalizeEditForDocs(payload);
  const editExample = extractJsonExample(readme, "edit");
  assert.match(readme, /edit\(\.\.\.\) -> AnchoredEditResult/);
  assert.deepEqual(editExample, expectedEditExample);
});
