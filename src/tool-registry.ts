import type { ExtensionAPI, ExtensionContext, ToolDefinition } from "@mariozechner/pi-coding-agent";
import {
  createBashTool,
  createEditTool,
  createFindTool,
  createGrepTool,
  createLsTool,
  createReadTool,
  createWriteTool,
} from "@mariozechner/pi-coding-agent";
import type { TSchema } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { classifyBuiltinTool, validatePythonHelperNames } from "./tools/python-tool-contract";
import type { PtcSettings } from "./contracts/settings";
import {
  normalizePtcToolOptions,
  type ActivePiToolInfo,
  type CallerMetadata,
  type ExecuteToolContext,
  type InternalToolExecute,
  type PtcToolDefinition,
  type PtcToolOptions,
  type ToolInfo,
} from "./contracts/tool-types";
import { logWarning } from "./utils";

function normalizeStoredPtc(ptc?: PtcToolOptions): PtcToolOptions | undefined {
  const normalized = normalizePtcToolOptions(ptc);
  if (!normalized) {
    return ptc;
  }

  const defaultExposure = ptc?.defaultExposure ?? normalized.defaultExposure;
  return {
    ...ptc,
    enabled: ptc?.enabled ?? normalized.callable,
    callable: normalized.callable,
    readOnly: ptc?.readOnly ?? normalized.isReadOnly,
    policy: normalized.executionPolicy,
    pythonName: normalized.pythonName,
    ...(defaultExposure !== undefined ? { defaultExposure } : {}),
  };
}

function classifyTool(name: string, ptc?: PtcToolOptions): { isReadOnly: boolean; ptc?: PtcToolOptions } {
  const normalized = normalizeStoredPtc(ptc);
  if (normalized) {
    return { isReadOnly: normalized.readOnly === true, ptc: normalized };
  }

  return { isReadOnly: classifyBuiltinTool(name, ptc).isReadOnly, ptc };
}

function hasInternalExecute(tool: ActivePiToolInfo): tool is ActivePiToolInfo & { execute: InternalToolExecute } {
  return typeof tool.execute === "function";
}

function createUnavailableExecute(toolName: string): InternalToolExecute {
  return async () => {
    throw new Error(`Tool ${toolName} execute function not available`);
  };
}

export interface CallableToolRuntime {
  tools: ToolInfo[];
  runTool(toolName: string, params: unknown, nestedCallId: string): Promise<unknown>;
}

type BuiltinTool =
  | ReturnType<typeof createReadTool>
  | ReturnType<typeof createBashTool>
  | ReturnType<typeof createEditTool>
  | ReturnType<typeof createWriteTool>
  | ReturnType<typeof createGrepTool>
  | ReturnType<typeof createFindTool>
  | ReturnType<typeof createLsTool>;

type BuiltinToolFactory = (cwd: string) => BuiltinTool;

function validateToolParams(tool: ToolInfo, params: unknown): void {
  if (Value.Check(tool.parameters as TSchema, params)) {
    return;
  }

  const details = [...Value.Errors(tool.parameters as TSchema, params)]
    .slice(0, 3)
    .map((error) => `${error.path || "/"}: ${error.message}`)
    .join("; ");
  const suffix = details ? ` ${details}` : "";
  throw new Error(`Invalid parameters for ${tool.name}.${suffix}`.trim());
}

export class ToolRegistry {
  private customTools = new Map<string, ToolInfo>();
  private extensionOwnedToolNames = new Set<string>();
  private extensionExecutors = new Map<string, ToolInfo>();

  constructor(private pi: ExtensionAPI) {
    // Bridge: consume hashline tool executors.
    // Remove when pi exposes getToolExecutor() on ExtensionAPI.
    // Grep marker: "hashline:tool-executors"
    const preEmitted = (globalThis as any).__hashlineToolExecutors;
    if (preEmitted) {
      this.ingestExtensionExecutors(preEmitted);
    }
    pi.events.on("hashline:tool-executors", (data: unknown) => {
      this.ingestExtensionExecutors(data);
    });
  }

  private ingestExtensionExecutors(data: unknown): void {
    if (!data || typeof data !== "object") return;
    for (const [, toolDef] of Object.entries(data as Record<string, unknown>)) {
      if (!toolDef || typeof toolDef !== "object") continue;
      const t = toolDef as { name?: string; execute?: unknown; ptc?: PtcToolOptions; parameters?: unknown };
      if (typeof t.name !== "string" || typeof t.execute !== "function") continue;
      const classification = classifyTool(t.name, t.ptc);
      this.extensionExecutors.set(t.name, {
        name: t.name,
        description: "",
        parameters: (t.parameters ?? { type: "object", properties: {} }) as import("@sinclair/typebox").TSchema,
        execute: t.execute as InternalToolExecute,
        ptc: classification.ptc,
        source: "extension",
        isReadOnly: classification.isReadOnly,
      });
    }
  }

  upsertTool<TParams extends TSchema, TDetails>(tool: ToolDefinition<TParams, TDetails>): void {
    const ptc = (tool as PtcToolDefinition<TParams, TDetails>).ptc;
    const classification = classifyTool(tool.name, ptc);
    this.extensionOwnedToolNames.add(tool.name);
    this.customTools.set(tool.name, {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      execute: tool.execute as unknown as InternalToolExecute,
      ptc: classification.ptc,
      source: "extension",
      isReadOnly: classification.isReadOnly,
    });
  }

  removeTool(name: string): boolean {
    this.extensionOwnedToolNames.add(name);
    return this.customTools.delete(name);
  }

  private createBuiltinTools(cwd: string): Map<string, ToolInfo> {
    const builtins = new Map<string, ToolInfo>();
    const factories: Array<{ name: string; create: BuiltinToolFactory }> = [
      { name: "read", create: createReadTool },
      { name: "bash", create: createBashTool },
      { name: "edit", create: createEditTool },
      { name: "write", create: createWriteTool },
      { name: "grep", create: createGrepTool },
      { name: "find", create: createFindTool },
      { name: "ls", create: createLsTool },
    ];

    for (const { name, create } of factories) {
      try {
        const tool = create(cwd);
        const executeBuiltin = tool.execute as unknown as InternalToolExecute;
        const classification = classifyTool(tool.name);
        builtins.set(name, {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
          source: "builtin",
          isReadOnly: classification.isReadOnly,
          ptc: classification.ptc,
          execute: async (toolCallId, params, signal, onUpdate, ctx) =>
            await executeBuiltin(toolCallId, params, signal, onUpdate, ctx),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logWarning(`Builtin tool '${name}' failed to initialize: ${message}`);
      }
    }

    const findTool = builtins.get("find");
    if (findTool) {
      builtins.set("glob", {
        ...findTool,
        name: "glob",
        description: "Find files by glob pattern. Alias of find(). Returns a list of matching relative paths in code_execution.",
        source: "alias",
        isReadOnly: true,
      });
    }

    return builtins;
  }

  private buildToolMap(cwd?: string): Map<string, ToolInfo> {
    const allTools = new Map<string, ToolInfo>();
    const builtinTools = this.createBuiltinTools(cwd || process.cwd());
    const activeToolNames = new Set(this.pi.getActiveTools());

    for (const builtin of builtinTools.values()) {
      allTools.set(builtin.name, builtin);
    }

    // Bridge: overlay extension executors from EventBus.
    // Remove when pi exposes getToolExecutor() on ExtensionAPI.
    for (const [name, extTool] of this.extensionExecutors) {
      const existing = allTools.get(name);
      if (existing) {
        allTools.set(name, {
          ...existing,
          execute: extTool.execute,
          ptc: extTool.ptc ?? existing.ptc,
          isReadOnly: extTool.isReadOnly,
        });
      } else {
        allTools.set(name, extTool);
      }
    }

    for (const customTool of this.customTools.values()) {
      allTools.set(customTool.name, customTool);
    }

    for (const piTool of this.pi.getAllTools() as ActivePiToolInfo[]) {
      if (this.extensionOwnedToolNames.has(piTool.name) && !this.customTools.has(piTool.name)) {
        continue;
      }

      const existing = allTools.get(piTool.name);
      const existingIsBuiltin = existing?.source === "builtin" || existing?.source === "alias";
      const shouldUsePiOverride = activeToolNames.has(piTool.name);

      if (existing) {
        if (existingIsBuiltin && !shouldUsePiOverride) {
          continue;
        }

        const mergedPtc = normalizeStoredPtc(piTool.ptc ?? existing.ptc);
        const classification = classifyTool(piTool.name, mergedPtc);
        allTools.set(piTool.name, {
          ...existing,
          description: piTool.description,
          parameters: piTool.parameters,
          ptc: classification.ptc,
          isReadOnly: classification.isReadOnly,
          execute: shouldUsePiOverride && hasInternalExecute(piTool) ? piTool.execute : existing.execute,
        });
        continue;
      }

      const classification = classifyTool(piTool.name, piTool.ptc);
      allTools.set(piTool.name, {
        name: piTool.name,
        description: piTool.description,
        parameters: piTool.parameters,
        execute: shouldUsePiOverride && hasInternalExecute(piTool) ? piTool.execute : createUnavailableExecute(piTool.name),
        ptc: classification.ptc,
        source: "extension",
        isReadOnly: classification.isReadOnly,
      });
    }

    return allTools;
  }

  getAllTools(cwd?: string): ToolInfo[] {
    return Array.from(this.buildToolMap(cwd).values());
  }

  getCallableTools(cwd: string, settings: PtcSettings): ToolInfo[] {
    const allTools = this.getAllTools(cwd);
    const allowSet = settings.callableTools ? new Set(settings.callableTools) : null;
    const blockedSet = new Set(settings.blockedTools || []);
    const trustedReadOnlyTools = new Set(settings.trustedReadOnlyTools || []);

    const callableTools = allTools.filter((tool) => {
      if (tool.name === "code_execution") {
        return false;
      }
      if (blockedSet.has(tool.name)) {
        return false;
      }
      if (allowSet && !allowSet.has(tool.name)) {
        return false;
      }
      if (tool.name === "bash" && !settings.allowBash) {
        return false;
      }

      const isBuiltin = tool.source === "builtin" || tool.source === "alias";
      const normalizedPtc = normalizePtcToolOptions(tool.ptc);
      if (normalizedPtc?.defaultExposure === "opt-in" && (!allowSet || !allowSet.has(tool.name))) {
        return false;
      }
      const isTrustedReadOnlyCustom =
        !isBuiltin &&
        normalizedPtc?.callable === true &&
        normalizedPtc.isReadOnly &&
        trustedReadOnlyTools.has(tool.name);

      if (!settings.allowMutations) {
        if (!isBuiltin && !isTrustedReadOnlyCustom) {
          return false;
        }
        if (!tool.isReadOnly && !isTrustedReadOnlyCustom) {
          return false;
        }
      }

      return isBuiltin || normalizedPtc?.callable === true;
    });

    validatePythonHelperNames(callableTools);
    return callableTools;
  }

  createCallableToolRuntime(
    cwd: string,
    settings: PtcSettings,
    execution: ExecuteToolContext & { parentToolCallId?: string }
  ): CallableToolRuntime {
    const callableTools = this.getCallableTools(cwd, settings);
    const callableToolMap = new Map(callableTools.map((tool) => [tool.name, tool]));

    return {
      tools: callableTools,
      runTool: async (toolName, params, nestedCallId) => {
        const tool = callableToolMap.get(toolName);
        if (!tool) {
          throw new Error(
            `Unknown callable tool: ${toolName}. Available: ${Array.from(callableToolMap.keys()).join(", ")}`
          );
        }

        validateToolParams(tool, params);

        const toolCallId = nestedCallId || `ptc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const ctxWithCaller = Object.assign({}, execution.ctx, {
          caller: {
            type: "code_execution",
            parentToolCallId: execution.parentToolCallId,
            nestedCallId: toolCallId,
          } satisfies CallerMetadata,
        }) as ExtensionContext & { caller?: CallerMetadata };

        return await tool.execute(toolCallId, params, execution.signal, undefined, ctxWithCaller);
      },
    };
  }
}
