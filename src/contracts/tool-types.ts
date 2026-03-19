import type {
  AgentToolUpdateCallback,
  ExtensionContext,
  ToolDefinition,
  ToolInfo as ExtensionToolInfo,
} from "@mariozechner/pi-coding-agent";
import type { TSchema } from "@sinclair/typebox";

export type PtcExecutionPolicy = "read-only" | "mutating";
export type PtcToolDefaultExposure = "safe-by-default" | "opt-in" | "not-safe-by-default";
export interface PtcToolOptions {
  enabled?: boolean;
  callable?: boolean;
  readOnly?: boolean;
  policy?: PtcExecutionPolicy;
  pythonName?: string;
  defaultExposure?: PtcToolDefaultExposure;
}
export interface NormalizedPtcToolOptions {
  callable: boolean;
  executionPolicy: PtcExecutionPolicy;
  isReadOnly: boolean;
  pythonName?: string;
  defaultExposure?: PtcToolDefaultExposure;
}

export function normalizePtcToolOptions(ptc?: PtcToolOptions): NormalizedPtcToolOptions | undefined {
  if (!ptc) {
    return undefined;
  }

  const callable = ptc.callable ?? ptc.enabled ?? false;
  const executionPolicy = ptc.policy ?? (ptc.readOnly === true ? "read-only" : "mutating");

  return {
    callable,
    executionPolicy,
    isReadOnly: executionPolicy === "read-only",
    pythonName: ptc.pythonName,
    defaultExposure: ptc.defaultExposure,
  };
}

export type PtcToolDefinition<
  TParams extends TSchema = TSchema,
  TDetails = unknown,
> = ToolDefinition<TParams, TDetails> & {
  ptc?: PtcToolOptions;
};

export interface LoadedTool {
  tool: PtcToolDefinition;
  filename: string;
}

export type ToolUpdateCallback = AgentToolUpdateCallback<unknown>;

/**
 * Pi's runtime currently invokes tool executors as:
 *   execute(toolCallId, params, signal, onUpdate, ctx)
 * Keep the internal registry aligned with that runtime order so builtins,
 * extension tools, and active-tool overrides share one callable path.
 */
export type InternalToolExecute = (
  toolCallId: string,
  params: unknown,
  signal?: AbortSignal,
  onUpdate?: ToolUpdateCallback,
  ctx?: ExtensionContext
) => Promise<unknown>;

export type ToolSource = "builtin" | "alias" | "extension";

export interface ToolInfo extends ExtensionToolInfo {
  execute: InternalToolExecute;
  source: ToolSource;
  isReadOnly: boolean;
  ptc?: PtcToolOptions;
}

export interface ActivePiToolInfo extends ExtensionToolInfo {
  execute?: InternalToolExecute;
  ptc?: PtcToolOptions;
}

export interface CallerMetadata {
  type: "code_execution";
  parentToolCallId?: string;
  nestedCallId: string;
}

export interface ExecuteToolContext {
  ctx: ExtensionContext;
  signal?: AbortSignal;
  caller?: CallerMetadata;
}
