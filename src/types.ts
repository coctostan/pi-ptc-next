import type {
  CallerMetadata as InternalCallerMetadata,
  ExecuteToolContext as InternalExecuteToolContext,
  LoadedTool as InternalLoadedTool,
  PtcCaller as InternalPtcCaller,
  PtcToolDefinition as InternalPtcToolDefinition,
  PtcToolOptions as InternalPtcToolOptions,
  ToolInfo as InternalToolInfo,
  ToolSource as InternalToolSource,
} from "./contracts/tool-types";
import type {
  CodeExecutionResult as InternalCodeExecutionResult,
  ExecutionDetails as InternalExecutionDetails,
  ExecutionOptions as InternalExecutionOptions,
  NormalizedToolResult as InternalNormalizedToolResult,
  RpcErrorPayload as InternalRpcErrorPayload,
  RpcMessage as InternalRpcMessage,
  SandboxManager as InternalSandboxManager,
} from "./contracts/execution-types";
import type {
  FileHandle as InternalFileHandle,
  ResponseHandle as InternalResponseHandle,
  SupportedHandle as InternalSupportedHandle,
} from "./contracts/handle-types";
import type { PtcReport as InternalPtcReport, PtcReportJsonValue as InternalPtcReportJsonValue, PtcReportScalar as InternalPtcReportScalar, PtcReportSample as InternalPtcReportSample, PtcReportTable as InternalPtcReportTable } from "./report";
import type { PtcSettings as InternalPtcSettings } from "./contracts/settings";

export type CallerMetadata = InternalCallerMetadata;
export type ExecuteToolContext = InternalExecuteToolContext;
export type LoadedTool = InternalLoadedTool;
export type PtcCaller = InternalPtcCaller;
export type PtcToolDefinition = InternalPtcToolDefinition;
export type PtcToolOptions = InternalPtcToolOptions;
export type ToolInfo = InternalToolInfo;
export type ToolSource = InternalToolSource;

export type CodeExecutionResult = InternalCodeExecutionResult;
export type ExecutionDetails = InternalExecutionDetails;
export type ExecutionOptions = InternalExecutionOptions;
export type NormalizedToolResult = InternalNormalizedToolResult;
export type RpcErrorPayload = InternalRpcErrorPayload;
export type RpcMessage = InternalRpcMessage;
export type SandboxManager = InternalSandboxManager;
export type FileHandle = InternalFileHandle;
export type ResponseHandle = InternalResponseHandle;
export type SupportedHandle = InternalSupportedHandle;
export type PtcReport = InternalPtcReport;
export type PtcReportJsonValue = InternalPtcReportJsonValue;
export type PtcReportScalar = InternalPtcReportScalar;
export type PtcReportSample = InternalPtcReportSample;
export type PtcReportTable = InternalPtcReportTable;

export type PtcSettings = InternalPtcSettings;
