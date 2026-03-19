// @ts-nocheck
const test = module.require("node:test");
const assert = module.require("node:assert/strict");
const { normalizeToolResult } = module.require("../dist/tool-adapters.js");

const hashlineReadValue = {
  path: "src/tool-adapters.ts",
  startLine: 1,
  endLine: 3,
  lines: [
    { anchor: "1:abc123", text: 'import type { NormalizedToolResult } from "./contracts/execution-types";' },
    { anchor: "2:def456", text: "" },
    { anchor: "3:ghi789", text: "interface ToolExecutionResult {" },
  ],
};

const hashlineGrepValue = {
  matches: [
    { path: "src/tool-adapters.ts", anchor: "79:aa11", line: 79, text: "function extractPtcValue(details: unknown)", kind: "match" },
    { path: "src/tool-adapters.ts", anchor: "80:bb22", line: 80, text: 'if (!isRecord(details) || !("ptcValue" in details)) {', kind: "context" },
  ],
};

const hashlineEditValue = {
  ok: true,
  files: ["src/tool-adapters.ts"],
  edits: [
    {
      startAnchor: "79:aa11",
      endAnchor: "88:cc33",
      status: "applied",
    },
  ],
};

test("normalizeToolResult converts find empty sentinel to empty array", () => {
  const result = normalizeToolResult("find", {
    content: [{ type: "text", text: "No files found matching pattern" }],
  });

  assert.deepEqual(result.value, []);
  assert.equal(result.estimatedChars, 2);
});

test("normalizeToolResult parses grep output into structured matches when ptcValue is absent", () => {
  const result = normalizeToolResult("grep", {
    content: [
      {
        type: "text",
        text: "src/index.ts:12: const value = 1\nsrc/index.ts-13- const context = 2",
      },
    ],
  });

  assert.deepEqual(result.value, [
    { path: "src/index.ts", line: 12, text: "const value = 1", kind: "match" },
    { path: "src/index.ts", line: 13, text: "const context = 2", kind: "context" },
  ]);
});

test("normalizeToolResult returns read-style details.ptcValue unchanged", () => {
  const result = normalizeToolResult("read", {
    content: [{ type: "text", text: "human-readable hashline output" }],
    details: { ptcValue: hashlineReadValue },
  });

  assert.deepEqual(result.value, hashlineReadValue);
  assert.equal(result.estimatedChars, JSON.stringify(hashlineReadValue).length);
});

test("normalizeToolResult returns grep-style details.ptcValue unchanged", () => {
  const result = normalizeToolResult("grep", {
    content: [{ type: "text", text: "human-readable grep output" }],
    details: { ptcValue: hashlineGrepValue },
  });

  assert.deepEqual(result.value, hashlineGrepValue);
  assert.equal(result.estimatedChars, JSON.stringify(hashlineGrepValue).length);
});

test("normalizeToolResult returns edit-style details.ptcValue unchanged", () => {
  const result = normalizeToolResult("edit", {
    content: [{ type: "text", text: "Updated src/tool-adapters.ts" }],
    details: { ptcValue: hashlineEditValue, diff: "@@ -1 +1 @@" },
  });

  assert.deepEqual(result.value, hashlineEditValue);
  assert.equal(result.estimatedChars, JSON.stringify(hashlineEditValue).length);
});

test("normalizeToolResult returns details.ptcValue unchanged for generic custom tools", () => {
  const value = { rows: [{ id: 1 }], rowCount: 1 };
  const result = normalizeToolResult("query_db", {
    content: [{ type: "text", text: "Returned 1 rows" }],
    details: { ptcValue: value },
  });

  assert.deepEqual(result.value, value);
});

test("normalizeToolResult keeps read fallback on text only", () => {
  const result = normalizeToolResult("read", {
    content: [{ type: "text", text: "1:abc|first line\n2:def|second line" }],
  });

  assert.equal(result.value, "1:abc|first line\n2:def|second line");
});

test("normalizeToolResult keeps edit fallback on summary and diff when ptcValue is absent", () => {
  const result = normalizeToolResult("edit", {
    content: [{ type: "text", text: "Updated src/tool-adapters.ts" }],
    details: { diff: "@@ -1 +1 @@" },
  });

  assert.deepEqual(result.value, {
    ok: true,
    summary: "Updated src/tool-adapters.ts",
    diff: "@@ -1 +1 @@",
  });
});

test("normalizeToolResult keeps custom tool fallback on text only", () => {
  const result = normalizeToolResult("query_db", {
    content: [{ type: "text", text: "Returned 1 rows" }],
    details: { internal: true },
  });

  assert.equal(result.value, "Returned 1 rows");
});
