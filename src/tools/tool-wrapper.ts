import type { ToolInfo } from "../contracts/tool-types";
import {
  buildMultilinePythonSignature,
  buildPythonParamMetadata,
  getPythonHelperName,
  getPythonReturnType,
} from "./python-tool-contract";

function buildParamsDictionary(paramNames: string[]): string {
  if (paramNames.length === 0) {
    return "    params = {}";
  }

  return `    params = _ptc_drop_none({\n${paramNames
    .map((paramName) => `        ${JSON.stringify(paramName)}: ${paramName}`)
    .join(",\n")}\n    })`;
}

function buildGenericToolWrapper(tool: ToolInfo): string {
  const pythonName = getPythonHelperName(tool);
  const returnType = getPythonReturnType(tool);
  const params = buildPythonParamMetadata(tool);
  const signature = buildMultilinePythonSignature(pythonName, returnType, params);
  const paramsDict = buildParamsDictionary(params.map((entry) => entry.name));

  return `${signature}
${paramsDict}
    return await _rpc_call(${JSON.stringify(tool.name)}, params)`;
}

function buildReadWrapper(): string {
  return `async def read(
    path: str,
    *,
    offset: Optional[int] = None,
    limit: Optional[int] = None,
    symbol: Optional[str] = None,
    map: Optional[bool] = None,
) -> Union[str, ReadResult]:
    params = _ptc_drop_none({
        "path": path,
        "offset": offset,
        "limit": limit,
        "symbol": symbol,
        "map": map,
    })
    return await _rpc_call("read", params)`;
}

export function generateToolWrappers(tools: ToolInfo[]): string {
  const imports = `from typing import Optional, List, Dict, Any, TypedDict, Union`;
  const helpers = `
class HashlineLine(TypedDict):
    line: int
    hash: str
    anchor: str
    raw: str
    display: str
class ReadLine(TypedDict):
    anchor: str
    text: str
class ReadRange(TypedDict):
    startLine: int
    endLine: int
    totalLines: int
class ReadWarning(TypedDict):
    code: str
    message: str
class ReadTruncation(TypedDict):
    outputLines: int
    totalLines: int
    outputBytes: int
    totalBytes: int
class ReadSymbol(TypedDict, total=False):
    query: str
    name: str
    kind: str
    parentName: str
    startLine: int
    endLine: int
class ReadMap(TypedDict):
    requested: bool
    appended: bool
class ReadResult(TypedDict):
    tool: str
    path: str
    range: ReadRange
    warnings: List[ReadWarning]
    truncation: Optional[ReadTruncation]
    symbol: Optional[ReadSymbol]
    map: ReadMap
    lines: List[HashlineLine]
class SgRange(TypedDict):
    startLine: int
    endLine: int
class SgFile(TypedDict):
    path: str
    ranges: List[SgRange]
    lines: List[HashlineLine]
class SgResult(TypedDict):
    tool: str
    files: List[SgFile]
class GrepMatch(TypedDict, total=False):
    path: str
    line: int
    hash: str
    anchor: str
    kind: str
    text: str
    raw: str
    display: str
class GrepResult(TypedDict):
    tool: str
    summary: bool
    totalMatches: int
    records: List[GrepMatch]
class BashResult(TypedDict):
    stdout: str
    stderr: str
    exitCode: int
class EditSpan(TypedDict, total=False):
    startAnchor: str
    endAnchor: str
    status: str
class EditNoop(TypedDict, total=False):
    editIndex: int
    loc: str
    currentContent: str
class AnchoredEditResult(TypedDict, total=False):
    tool: str
    ok: bool
    path: str
    summary: str
    diff: str
    firstChangedLine: Optional[int]
    warnings: List[str]
    noopEdits: List[EditNoop]
class WriteResult(TypedDict):
    ok: bool
    summary: str


def _ptc_drop_none(params: Dict[str, Any]) -> Dict[str, Any]:
    return {key: value for key, value in params.items() if value is not None}
`;

  const wrappers = tools.map((tool) => {
    if (tool.name === "read") {
      return buildReadWrapper();
    }
    return buildGenericToolWrapper(tool);
  });

  return `${imports}${helpers}\n\n${wrappers.join("\n\n")}`;
}
