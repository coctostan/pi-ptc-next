import { Type } from "@sinclair/typebox";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { getKeybindings, Text, type Component, type Keybinding } from "@mariozechner/pi-tui";
import { CodeExecutor } from "./code-executor";
import { PtcPythonError } from "./execution/execution-errors";
import { CustomToolManager } from "./custom-tool-manager";
import { buildCodeExecutionRecoveryPrompt, classifyCodeExecutionFailure } from "./recovery-classifier";
import {
  armAutomaticRecovery,
  buildPtcExecutionTelemetry,
  buildPtcRecoveryDetails,
  createPtcRecoveryState,
  noteAutomaticRouting,
  noteCodeExecutionAttempt,
  noteCodeExecutionFailure,
  noteCodeExecutionSuccess,
  type PtcRecoveryState,
} from "./recovery-state";
import { renderPtcReportLines } from "./report";
import { createSandbox } from "./sandbox-manager";
import { ToolRegistry } from "./tool-registry";
import type { ExecutionDetails, PtcSettings, PtcToolDefinition, SandboxManager, ToolInfo } from "./types";
import { debugLog, isMutationPrompt, loadSettingsFromEnv, shouldAutoRoutePromptToCodeExecution } from "./utils";

const CODE_EXECUTION_PROMPT_SNIPPET =
  "Run Python orchestration for repo-wide or batched analysis using local tool wrappers.";

const CODE_EXECUTION_PROMPT_GUIDELINES = [
  "Use for repeated tool calls or aggregation; prefer direct tools for one-off reads/searches.",
];

const CODE_EXECUTION_AUTO_ROUTE_PROMPT =
  "This request is a strong fit for code_execution. Prefer calling code_execution first and keep large intermediate results inside Python unless the user explicitly asked to see them.";

interface PtcSystemPromptOptions {
  selectedTools?: string[];
  promptGuidelines?: string[];
}

interface PtcBeforeAgentStartEvent {
  prompt?: string;
  systemPrompt: string;
  systemPromptOptions?: PtcSystemPromptOptions;
}

function renderExecutingCode(
  codeLines: string[],
  currentLine: number,
  totalLines: number,
  theme: Theme
): Component {
  const lines: string[] = [];
  lines.push(theme.fg("muted", `Executing Python code (line ${currentLine}/${totalLines}):`));
  lines.push("");

  codeLines.forEach((line, index) => {
    const lineNumber = index + 1;
    const isCurrentLine = lineNumber === currentLine;
    let prefix = `${String(lineNumber).padStart(3, " ")} │ `;
    let content = line;

    if (isCurrentLine) {
      prefix = theme.fg("success", `→ ${String(lineNumber).padStart(2, " ")} │ `);
      content = theme.fg("text", line);
    } else if (lineNumber < currentLine) {
      prefix = theme.fg("muted", prefix);
      content = theme.fg("muted", line);
    } else {
      prefix = theme.fg("muted", prefix);
    }

    lines.push(prefix + content);
  });

  return new Text(lines.join("\n"), 0, 0);
}

function formatKeys(keys: string[]): string {
  if (keys.length === 0) return "";
  if (keys.length === 1) return keys[0];
  return keys.join("/");
}

function renderKeyHint(keybinding: Keybinding, description: string, theme: Theme): string {
  return theme.fg("dim", formatKeys(getKeybindings().getKeys(keybinding))) + theme.fg("muted", ` ${description}`);
}

function formatPythonSourceLines(codeLines: string[]): string[] {
  return codeLines.map((line, index) => `${String(index + 1).padStart(3, " ")} │ ${line}`);
}

function renderCompletedOutput(
  resultText: string,
  details: ExecutionDetails | undefined,
  theme: Theme,
  expanded: boolean
): Component {
  if (!details) {
    return new Text(resultText || "(No output)", 0, 0);
  }

  const summary = theme.fg(
    "muted",
    `[PTC] nested calls=${details.nestedToolCalls}, nested results=${details.nestedResultCount}, ` +
      `estimated avoided tokens≈${details.estimatedAvoidedTokens}, duration=${Math.round(details.durationMs / 1000)}s`
  );

  const body = details.report ? renderPtcReportLines(details.report, expanded) : [resultText || "(No output)"];
  const lines = [summary, "", ...body];

  if (details.userCode?.length) {
    lines.push("");
    if (expanded) {
      lines.push(theme.fg("muted", "Python source"));
      lines.push(...formatPythonSourceLines(details.userCode));
    } else {
      const lineLabel = details.userCode.length === 1 ? "line" : "lines";
      lines.push(
        theme.fg(
          "muted",
          `Python source: ${details.userCode.length} ${lineLabel} (${renderKeyHint("app.tools.expand", "to inspect Python source", theme)})`
        )
      );
    }
  }

  return new Text(lines.join("\n"), 0, 0);
}

function buildToolDescription(): string {
  return "Run Python orchestration for repo-wide or batched analysis using local tool wrappers. Use ptc.list_helpers() and ptc.help(name) for available helpers. Direct wrappers include read, grep, find, ls, and glob.";
}
function getExtensionRoot(): string {
  return __dirname.endsWith("/dist") || __dirname.endsWith("\\dist")
    ? __dirname.replace(/[/\\]dist$/, "")
    : __dirname;
}

function getRequestRecoveryState(sessionState: PtcSessionState): PtcRecoveryState {
  if (!sessionState.recoveryState) {
    sessionState.recoveryState = createPtcRecoveryState();
  }

  return sessionState.recoveryState;
}

function buildRecoveryContextMessage(content: string) {
  return {
    role: "custom" as const,
    customType: "ptc-recovery",
    content,
    display: true,
    timestamp: Date.now(),
  };
}

function buildCodeExecutionTool(
  currentSettings: PtcSettings,
  callableTools: ToolInfo[],
  codeExecutor: CodeExecutor,
  sessionState: PtcSessionState
): PtcToolDefinition {
  return {
    name: "code_execution",
    label: "Code Execution",
    description: buildToolDescription(),
    promptSnippet: CODE_EXECUTION_PROMPT_SNIPPET,
    promptGuidelines: CODE_EXECUTION_PROMPT_GUIDELINES,
    parameters: Type.Object({
      code: Type.String({
        description: "Python code to execute."
      }),
    }),
    execute: async (toolCallId, { code }, signal, onUpdate, ctx) => {
      const recoveryState = getRequestRecoveryState(sessionState);
      noteCodeExecutionAttempt(recoveryState);

      try {
        const result = await codeExecutor.execute(code, {
          cwd: ctx.cwd,
          ctx,
          signal,
          onUpdate,
          parentToolCallId: toolCallId,
          recoveryState,
        });

        noteCodeExecutionSuccess(recoveryState);
        return {
          content: [{ type: "text" as const, text: result.output || "(No output)" }],
          details: {
            ...result.details,
            telemetry: buildPtcExecutionTelemetry(recoveryState),
            recovery: buildPtcRecoveryDetails(recoveryState),
          },
        };
      } catch (error) {
        if (error instanceof PtcPythonError) {
          const failureClass = classifyCodeExecutionFailure(error.rawMessage, error.traceback, code);
          if (sessionState.recoveryAllowed && failureClass && armAutomaticRecovery(recoveryState, currentSettings, failureClass)) {
            sessionState.pendingRecoveryPrompt = buildCodeExecutionRecoveryPrompt(failureClass);
          }

          noteCodeExecutionFailure(recoveryState);

          if (error.details?.userCode?.length) {
            return {
              content: [{ type: "text" as const, text: error.message }],
              details: {
                ...error.details,
                telemetry: buildPtcExecutionTelemetry(recoveryState),
                recovery: buildPtcRecoveryDetails(recoveryState),
              },
            };
          }
        } else {
          noteCodeExecutionFailure(recoveryState);
        }

        throw error;
      }
    },
    renderResult(result, { expanded, isPartial }, theme) {
      const details = result.details as ExecutionDetails | undefined;
      if (isPartial && details?.userCode && details.currentLine) {
        return renderExecutingCode(
          details.userCode,
          details.currentLine,
          details.totalLines || details.userCode.length,
          theme
        );
      }

      const text = result.content
        .filter((content): content is { type: "text"; text: string } => content.type === "text")
        .map((content) => content.text)
        .join("");

      return renderCompletedOutput(text, details, theme, expanded ?? false);
    },
  };
}

interface PtcSessionState {
  currentCwd: string;
  customToolsStarted: boolean;
  activeToolsBeforeRouting: string[] | null;
  pendingRecoveryPrompt: string | null;
  recoveryAllowed: boolean;
  recoveryState: PtcRecoveryState | null;
}

function areToolListsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function textHasCodeExecutionRoutingGuidance(text: string | undefined): boolean {
  if (!text || !/\bcode_execution\b/i.test(text)) {
    return false;
  }

  return /repo-wide|repeated lookup|grouping|ranking|counting|3\+ dependent|large intermediate|compact|batch|aggregat/i.test(text);
}

function shouldAppendAutoRoutePrompt(
  currentSystemPrompt: string,
  systemPromptOptions: PtcSystemPromptOptions | undefined
): boolean {
  if (textHasCodeExecutionRoutingGuidance(currentSystemPrompt)) {
    return false;
  }

  const selectedTools = systemPromptOptions?.selectedTools ?? [];
  const promptGuidelines = systemPromptOptions?.promptGuidelines ?? [];
  if (
    selectedTools.includes("code_execution") &&
    promptGuidelines.some((guideline) => textHasCodeExecutionRoutingGuidance(guideline))
  ) {
    return false;
  }

  return true;
}

function applyAutoRouting(
  pi: ExtensionAPI,
  toolRegistry: ToolRegistry,
  settings: PtcSettings,
  sessionState: PtcSessionState,
  prompt: string,
  currentSystemPrompt: string,
  systemPromptOptions?: PtcSystemPromptOptions
): { systemPrompt?: string } | undefined {
  if (!settings.autoRoute || !shouldAutoRoutePromptToCodeExecution(prompt)) {
    return undefined;
  }

  const allTools = pi.getAllTools();
  if (!allTools.some((tool) => tool.name === "code_execution")) {
    return undefined;
  }

  noteAutomaticRouting(getRequestRecoveryState(sessionState));

  const activeTools = pi.getActiveTools();
  const routableToolNames = new Set(toolRegistry.getAutoRoutableToolNames(sessionState.currentCwd, settings));
  const nextActiveTools = activeTools.filter((name) => !routableToolNames.has(name));
  if (!nextActiveTools.includes("code_execution")) {
    nextActiveTools.push("code_execution");
  }

  if (!areToolListsEqual(activeTools, nextActiveTools)) {
    sessionState.activeToolsBeforeRouting = activeTools;
    pi.setActiveTools(nextActiveTools);
    debugLog("Auto-routed prompt to code_execution", { prompt, activeTools, nextActiveTools });
  }

  if (!shouldAppendAutoRoutePrompt(currentSystemPrompt, systemPromptOptions)) {
    return undefined;
  }

  return {
    systemPrompt: `${currentSystemPrompt}\n\n${CODE_EXECUTION_AUTO_ROUTE_PROMPT}`,
  };
}

function restoreActiveToolsAfterRouting(pi: ExtensionAPI, sessionState: PtcSessionState): void {
  if (!sessionState.activeToolsBeforeRouting) {
    return;
  }

  pi.setActiveTools(sessionState.activeToolsBeforeRouting);
  debugLog("Restored active tools after code_execution routing", {
    restored: sessionState.activeToolsBeforeRouting,
  });
  sessionState.activeToolsBeforeRouting = null;
}

function registerCodeExecutionTool(
  pi: ExtensionAPI,
  toolRegistry: ToolRegistry,
  settings: PtcSettings,
  codeExecutor: CodeExecutor,
  currentCwd: string,
  sessionState: PtcSessionState
): void {
  const callableTools = toolRegistry.getCallableTools(currentCwd, settings);
  pi.registerTool(buildCodeExecutionTool(settings, callableTools, codeExecutor, sessionState));
}

function registerCodeExecutionToolForState(
  pi: ExtensionAPI,
  toolRegistry: ToolRegistry,
  settings: PtcSettings,
  codeExecutor: CodeExecutor,
  sessionState: PtcSessionState
): void {
  registerCodeExecutionTool(pi, toolRegistry, settings, codeExecutor, sessionState.currentCwd, sessionState);
}

async function handleSessionStart(
  customToolManager: CustomToolManager,
  sessionState: PtcSessionState,
  pi: ExtensionAPI,
  toolRegistry: ToolRegistry,
  settings: PtcSettings,
  codeExecutor: CodeExecutor,
  _event: unknown,
  ctx: ExtensionContext
): Promise<void> {
  sessionState.currentCwd = ctx.cwd;
  if (!sessionState.customToolsStarted) {
    await customToolManager.start();
    sessionState.customToolsStarted = true;
  }

  registerCodeExecutionTool(pi, toolRegistry, settings, codeExecutor, sessionState.currentCwd, sessionState);
}

function handleBeforeAgentStart(
  pi: ExtensionAPI,
  toolRegistry: ToolRegistry,
  settings: PtcSettings,
  sessionState: PtcSessionState,
  event: PtcBeforeAgentStartEvent
): { systemPrompt?: string } | undefined {
  sessionState.pendingRecoveryPrompt = null;
  sessionState.recoveryAllowed = typeof event.prompt === "string" ? !isMutationPrompt(event.prompt) : true;
  sessionState.recoveryState = createPtcRecoveryState();

  if (typeof event.prompt !== "string") {
    return undefined;
  }

  return applyAutoRouting(pi, toolRegistry, settings, sessionState, event.prompt, event.systemPrompt, event.systemPromptOptions);
}

function handleContext(sessionState: PtcSessionState, event: { messages: Array<Record<string, unknown>> }) {
  if (!sessionState.pendingRecoveryPrompt) {
    return undefined;
  }

  const messages = [...event.messages, buildRecoveryContextMessage(sessionState.pendingRecoveryPrompt)];
  sessionState.pendingRecoveryPrompt = null;
  return { messages };
}

function handleAgentEnd(pi: ExtensionAPI, sessionState: PtcSessionState): void {
  restoreActiveToolsAfterRouting(pi, sessionState);
  sessionState.pendingRecoveryPrompt = null;
  sessionState.recoveryAllowed = true;
  sessionState.recoveryState = null;
}

async function handleSessionShutdown(
  customToolManager: CustomToolManager,
  sandboxManager: SandboxManager
): Promise<void> {
  customToolManager.close();
  await sandboxManager.cleanup();
}

export default async function ptcExtension(pi: ExtensionAPI, context?: ExtensionContext) {
  const settings = loadSettingsFromEnv();
  const extensionRoot = getExtensionRoot();
  const toolRegistry = new ToolRegistry(pi);
  const sandboxManager = await createSandbox(settings);
  const codeExecutor = new CodeExecutor(sandboxManager, toolRegistry, settings, extensionRoot);
  const sessionState: PtcSessionState = {
    currentCwd: context?.cwd ?? process.cwd(),
    customToolsStarted: false,
    activeToolsBeforeRouting: null,
    pendingRecoveryPrompt: null,
    recoveryAllowed: true,
    recoveryState: null,
  };

  const onToolSetChanged = registerCodeExecutionToolForState.bind(
    undefined,
    pi,
    toolRegistry,
    settings,
    codeExecutor,
    sessionState
  );
  const customToolManager = new CustomToolManager(extensionRoot, pi, toolRegistry, onToolSetChanged);

  const onSessionStart = handleSessionStart.bind(
    undefined,
    customToolManager,
    sessionState,
    pi,
    toolRegistry,
    settings,
    codeExecutor
  );
  const onBeforeAgentStart = handleBeforeAgentStart.bind(undefined, pi, toolRegistry, settings, sessionState);
  const onContext = handleContext.bind(undefined, sessionState);
  const onAgentEnd = handleAgentEnd.bind(undefined, pi, sessionState);
  const onSessionShutdown = handleSessionShutdown.bind(undefined, customToolManager, sandboxManager);

  pi.on("session_start", onSessionStart);
  pi.on("before_agent_start", onBeforeAgentStart);
  // Mario-scope Pi 0.73.1 emits context but its public ExtensionAPI overloads do not
  // include it yet. Keep the compatibility shim explicit until the local package scope
  // moves to a typed context overload.
  (pi as ExtensionAPI & { on(event: "context", handler: typeof onContext): void }).on("context", onContext);
  pi.on("agent_end", onAgentEnd);
  pi.on("session_shutdown", onSessionShutdown);
}
