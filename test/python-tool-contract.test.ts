import test from "node:test";
import assert from "node:assert/strict";
import { Type } from "@sinclair/typebox";
import type { ToolInfo } from "../dist/contracts/tool-types.js";
import {
  buildInlinePythonSignature,
  buildMultilinePythonSignature,
  buildPythonCallableToolMetadata,
  buildPythonCallableToolMetadataList,
  buildPythonParamMetadata,
  classifyBuiltinTool,
  describePythonHelper,
  describePythonHelpers,
  getBuiltinToolContract,
  getPythonReturnType,
  schemaToPythonType,
  validatePythonHelperNames,
} from "../dist/tools/python-tool-contract.js";
import { generateToolWrappers as generateToolWrappersForTests } from "../dist/tools/tool-wrapper.js";

function createTool(overrides: Record<string, unknown> = {}): ToolInfo {
  return {
    name: "search",
    description: "Search files",
    parameters: Type.Object({
      query: Type.String(),
      limit: Type.Optional(Type.Union([Type.Integer(), Type.Null()])),
      tags: Type.Optional(Type.Array(Type.String())),
    }, { additionalProperties: false }),
    source: "extension",
    isReadOnly: true,
    execute: (async () => ({ content: [{ type: "text", text: "ok" }], details: undefined })) as ToolInfo["execute"],
    ...(overrides as Partial<ToolInfo>),
  } as ToolInfo;
}

test("builtin contracts preserve read-only classification and return types", () => {
  assert.deepEqual(getBuiltinToolContract("read"), {
    isReadOnly: true,
    pythonReturnType: "Union[str, ReadResult]",
    helperSignature:
      "read(path: str, *, offset: Optional[int] = None, limit: Optional[int] = None, symbol: Optional[str] = None, map: Optional[bool] = None) -> Union[str, ReadResult]",
  });
  assert.deepEqual(classifyBuiltinTool("bash"), { isReadOnly: false });
  assert.deepEqual(classifyBuiltinTool("bash", { readOnly: true }), { isReadOnly: true });
  assert.equal(getPythonReturnType(createTool({ name: "custom" })), "Any");
  assert.equal(getPythonReturnType(createTool({ name: "grep" })), "Union[List[GrepMatch], GrepResult]");
  assert.equal(getPythonReturnType(createTool({ name: "edit" })), "AnchoredEditResult");
});

test("schemaToPythonType and parameter metadata handle unions, arrays, and keyword-only params", () => {
  assert.equal(schemaToPythonType(Type.String()), "str");
  assert.equal(schemaToPythonType(Type.Union([Type.String(), Type.Integer(), Type.Null()])), "Union[str, int]");
  assert.equal(schemaToPythonType(Type.Array(Type.Boolean())), "List[bool]");

  const params = buildPythonParamMetadata(createTool());
  assert.deepEqual(params, [
    { name: "query", keywordOnly: false, signature: "query: str" },
    { name: "limit", keywordOnly: true, signature: "limit: Optional[int] = None" },
    { name: "tags", keywordOnly: true, signature: "tags: Optional[List[str]] = None" },
  ]);
});

test("callable tool metadata stays serializable and preserves canonical plus helper names", () => {
  const metadata = buildPythonCallableToolMetadata(createTool({
    ptc: { pythonName: "search_py" },
    parameters: {
      type: "object",
      required: ["query"],
      properties: {
        nested: {
          type: "object",
          properties: {
            zed: { type: "string" },
            alpha: { type: "integer" },
          },
        },
        query: { type: "string" },
      },
    },
  }));

  assert.deepEqual(metadata, {
    name: "search",
    pythonName: "search_py",
    description: "Search files",
    source: "extension",
    isReadOnly: true,
    parameters: {
      properties: {
        nested: {
          properties: {
            alpha: { type: "integer" },
            zed: { type: "string" },
          },
          type: "object",
        },
        query: { type: "string" },
      },
      required: ["query"],
      type: "object",
    },
  });

  assert.deepEqual(buildPythonCallableToolMetadataList([
    createTool({ name: "read", ptc: { pythonName: "read_text" }, source: "builtin" }),
    createTool({ name: "search_alt", ptc: { pythonName: "search_alt_py" } }),
  ]).map((entry) => [entry.name, entry.pythonName]), [
    ["read", "read_text"],
    ["search_alt", "search_alt_py"],
  ]);
});

test("signature helpers render required and optional parameters consistently", () => {
  const params = buildPythonParamMetadata(createTool());

  assert.equal(
    buildInlinePythonSignature("search", "Any", params),
    "search(query: str, *, limit: Optional[int] = None, tags: Optional[List[str]] = None) -> Any"
  );
  assert.equal(
    buildMultilinePythonSignature("search", "Any", params),
    [
      "async def search(",
      "    query: str,",
      "    *,",
      "    limit: Optional[int] = None,",
      "    tags: Optional[List[str]] = None",
      ") -> Any:",
    ].join("\n")
  );
});

test("helper descriptions and wrappers expose read(symbol=..., map=...) passthrough", () => {
  assert.equal(
    describePythonHelper(createTool({ name: "read", ptc: { pythonName: "read_text" } })),
    "read_text(path: str, *, offset: Optional[int] = None, limit: Optional[int] = None, symbol: Optional[str] = None, map: Optional[bool] = None) -> Union[str, ReadResult]"
  );

  const wrapperCode = generateToolWrappersForTests([
    createTool({
      name: "read",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
        },
        required: ["path"],
      },
      source: "builtin",
      isReadOnly: true,
    }),
  ]);

  assert.match(wrapperCode, /symbol: Optional\[str\] = None/);
  assert.match(wrapperCode, /map: Optional\[bool\] = None/);
  assert.match(wrapperCode, /"symbol": symbol/);
  assert.match(wrapperCode, /"map": map/);

  assert.deepEqual(describePythonHelpers([
    createTool(),
    createTool({ name: "search_alt", ptc: { pythonName: "search_alt_py" } }),
  ]), [
    "search(query: str, *, limit: Optional[int] = None, tags: Optional[List[str]] = None) -> Any",
    "search_alt_py(query: str, *, limit: Optional[int] = None, tags: Optional[List[str]] = None) -> Any",
  ]);
  assert.equal(describePythonHelper(createTool({ name: "grep" })), "grep(query: str, *, limit: Optional[int] = None, tags: Optional[List[str]] = None) -> Union[List[GrepMatch], GrepResult]");
  assert.equal(describePythonHelper(createTool({ name: "edit" })), "edit(query: str, *, limit: Optional[int] = None, tags: Optional[List[str]] = None) -> AnchoredEditResult");
});


test("generated callable wrappers are async and descriptions are ready for await guidance", () => {
  const grepTool = createTool({
    name: "grep",
    parameters: Type.Object({
      pattern: Type.String(),
      path: Type.Optional(Type.Union([Type.String(), Type.Null()])),
    }, { additionalProperties: false }),
    source: "builtin",
    isReadOnly: true,
  });

  assert.equal(describePythonHelper(grepTool), "grep(pattern: str, *, path: Optional[str] = None) -> Union[List[GrepMatch], GrepResult]");
  const wrapperCode = generateToolWrappersForTests([grepTool]);
  assert.match(wrapperCode, /async def grep\(/);
  assert.match(wrapperCode, /pattern: str/);
});

test("generated wrappers expose edit semantic summary metadata", () => {
  const wrapperCode = generateToolWrappersForTests([]);
  assert.match(wrapperCode, /class SemanticSummary\(TypedDict, total=False\):/);
  assert.match(wrapperCode, /classification: str/);
  assert.match(wrapperCode, /difftasticAvailable: bool/);
  assert.match(wrapperCode, /movedBlocks: int/);
  assert.match(wrapperCode, /semanticSummary: Optional\[SemanticSummary\]/);
});

test("validatePythonHelperNames rejects duplicates and reserved aliases", () => {
  assert.throws(
    () => validatePythonHelperNames([createTool(), createTool({ name: "other", ptc: { pythonName: "search" } })]),
    /Duplicate Python helper name 'search'/
  );

  assert.throws(
    () => validatePythonHelperNames([createTool({ name: "other", ptc: { pythonName: "read" } })]),
    /Python helper name 'read' is reserved/
  );

  assert.doesNotThrow(() => validatePythonHelperNames([
    createTool({ name: "read" }),
    createTool({ name: "other", ptc: { pythonName: "search_other" } }),
  ]));
});

test("sg helper descriptions use a typed SgResult contract and reserve the sg helper name", () => {
  const sgTool = createTool({
    name: "sg",
    description: "AST grep",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string" },
        lang: { anyOf: [{ type: "string" }, { type: "null" }] },
        path: { anyOf: [{ type: "string" }, { type: "null" }] },
      },
      required: ["pattern"],
    },
  });
  assert.equal(getPythonReturnType(sgTool), "SgResult");
  assert.equal(
    describePythonHelper(sgTool),
    "sg(pattern: str, *, lang: Optional[str] = None, path: Optional[str] = None) -> SgResult"
  );
  assert.equal(
    describePythonHelper({ ...sgTool, ptc: { pythonName: "sg_search" } }),
    "sg_search(pattern: str, *, lang: Optional[str] = None, path: Optional[str] = None) -> SgResult"
  );
  assert.throws(
    () => validatePythonHelperNames([createTool({ name: "other", ptc: { pythonName: "sg" } })]),
    /Python helper name 'sg' is reserved/
  );
});
