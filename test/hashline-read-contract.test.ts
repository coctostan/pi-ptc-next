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

function loadReadPayloads() {
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
        `import { registerReadTool } from "./src/read.ts";
let tool;
registerReadTool({ registerTool(def) { tool = def; } });
const symbolResult = await tool.execute("tc", { path: "./tests/fixtures/small.ts", symbol: "createDemoDirectory" }, new AbortController().signal, () => {}, { cwd: process.cwd() });
const mapResult = await tool.execute("tc", { path: "./tests/fixtures/small.ts", map: true }, new AbortController().signal, () => {}, { cwd: process.cwd() });
console.log(JSON.stringify({ symbol: symbolResult.details.ptcValue, map: mapResult.details.ptcValue }));`,
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );
    return JSON.parse(stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createReadTool() {
  return {
    name: "read",
    description: "Read a file",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
      },
      required: ["path"],
    },
    source: "builtin",
    isReadOnly: true,
    execute: async () => ({ content: [{ type: "text", text: "ok" }], details: undefined }),
  };
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

function normalizeReadForDocs(repoRoot, payload) {
  return {
    ...payload,
    path: path.relative(repoRoot, payload.path),
  };
}

test("read live payload shape and TypedDict coverage stay aligned", () => {
  const payloads = loadReadPayloads();
  const wrapperCode = generateToolWrappers([createReadTool()]);
  assert.equal(payloads.symbol.tool, "read");
  assert.equal(payloads.symbol.symbol.query, "createDemoDirectory");
  assert.equal(payloads.map.map.requested, true);
  assert.equal(payloads.map.map.appended, true);
  assert.ok(payloads.symbol.lines.every((line) => ["line", "hash", "anchor", "raw", "display"].every((key) => key in line)));
  assert.match(wrapperCode, /class HashlineLine\(TypedDict\):/);
  assert.match(wrapperCode, /class ReadRange\(TypedDict\):/);
  assert.match(wrapperCode, /class ReadWarning\(TypedDict\):/);
  assert.match(wrapperCode, /class ReadTruncation\(TypedDict\):/);
  assert.match(wrapperCode, /class ReadSymbol\(TypedDict, total=False\):/);
  assert.match(wrapperCode, /class ReadMap\(TypedDict\):/);
  assert.match(wrapperCode, /class ReadResult\(TypedDict\):/);
  assert.match(wrapperCode, /range: ReadRange/);
  assert.match(wrapperCode, /warnings: List\[ReadWarning\]/);
  assert.match(wrapperCode, /truncation: Optional\[ReadTruncation\]/);
  assert.match(wrapperCode, /symbol: Optional\[ReadSymbol\]/);
  assert.match(wrapperCode, /map: ReadMap/);
  assert.match(wrapperCode, /lines: List\[HashlineLine\]/);
  assert.match(wrapperCode, /tool: str/);
  assert.match(wrapperCode, /line: int/);
  assert.match(wrapperCode, /hash: str/);
  assert.match(wrapperCode, /anchor: str/);
  assert.match(wrapperCode, /raw: str/);
  assert.match(wrapperCode, /display: str/);
  assert.match(wrapperCode, /startLine: int/);
  assert.match(wrapperCode, /endLine: int/);
  assert.match(wrapperCode, /totalLines: int/);
  assert.match(wrapperCode, /code: str/);
  assert.match(wrapperCode, /message: str/);
});

test("README read example exactly matches the normalized live payload", () => {
  const repoRoot = resolveHashlineRepoRoot();
  const payloads = loadReadPayloads();
  const readme = readFileSync(path.resolve(__dirname, "../README.md"), "utf8");
  const expectedReadExample = normalizeReadForDocs(repoRoot, payloads.symbol);
  const readExample = extractJsonExample(readme, "read");
  assert.match(readme, /read\(path, \*, offset=None, limit=None, symbol=None, map=None\) -> Union\[str, ReadResult\]/);
  assert.deepEqual(readExample, expectedReadExample);
});
