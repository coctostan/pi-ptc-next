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
import { describePythonHelpers } from "./tools/python-tool-contract";
import { ToolRegistry } from "./tool-registry";
import type { ExecutionDetails, PtcSettings, PtcToolDefinition, SandboxManager, ToolInfo } from "./types";
import { debugLog, isMutationPrompt, loadSettingsFromEnv, shouldAutoRoutePromptToCodeExecution } from "./utils";

const CODE_EXECUTION_PROMPT_SNIPPET =
  "Run Python with local Pi tool calls for repo-wide analysis, batching, aggregation, and compact results.";

const CODE_EXECUTION_PROMPT_GUIDELINES = [
  "Use code_execution for repo-wide analysis, repeated lookups, grouping, ranking, counting, or other tasks with 3+ dependent tool calls.",
  "Use direct tools instead for one-file reads, one-off grep/find calls, or small inspections.",
  "Prefer nu for pipeline-style structured-data or filesystem-metadata analysis with where, sort-by, group-by, first, or histogram.",
  "Use code_execution when custom per-item logic, stateful aggregation, complex return shapes, or multiple callable-tool orchestration is needed.",
  "Keep large intermediate results inside Python and return only the compact final answer the user needs.",
  "Use the callable tool list in the code_execution description; call ptc.list_callable_tools() only when branching on optional tools or when the needed tool may be unavailable.",
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

function buildToolDescription(currentSettings: PtcSettings, callableTools: ToolInfo[]): string {
  const callableHelperLines = describePythonHelpers(callableTools);
  const callable = callableTools.map((tool) => tool.ptc?.pythonName || tool.name).join(", ");
  const dockerBehavior = currentSettings.useDocker
    ? "- Docker isolation is required for this session; if Docker is unavailable, execution fails instead of falling back to subprocess."
    : "- Local subprocess mode is active because PTC_ALLOW_UNSANDBOXED_SUBPROCESS=true. Nested tool policy still applies, but Python itself is not isolated by Docker in this mode.";
  return `Execute Python code with local programmatic tool calling.

Prefer this tool first for repo-wide analysis, repeated lookups, loops, grouping, ranking, counting, filtering, or any task with 3+ dependent tool calls. Use direct tools instead for one-file reads, one-off grep/find calls, or tiny lookups.
Strong signals to use code_execution:
- Scan many files and return counts, grouped summaries, rankings, or compact JSON
- Run the same tool across many inputs and aggregate the results
- Keep large intermediate results out of the chat context
Examples:
- Count imports across src/**/*.ts and return the top 10 packages
- Analyze the first 8 test files and return compact JSON only
- Check many endpoints or records, then return only the failures
Important rules:
- Top-level await is already available. Do not call asyncio.run(...).
- Use generated helpers such as read(), glob(), find(), grep(), ls(), and ptc.* helpers. Do not call _rpc_call(...) directly.
- Return a compact final answer only. If you return a dict/list, it will be JSON-serialized automatically.
- Intermediate tool results stay local to this tool run and are not sent back to the model unless you include them in the final output.
- Prefer compact JSON summaries over raw dumps.
${dockerBehavior}
Prefer these patterns:
- Many file reads from explicit paths: ptc.read_many(paths, max_concurrency=...)
- Inspect ptc.list_callable_tools() before branching on optional tools; otherwise use the callable tool list below directly.
- Bounded concurrency for arbitrary coroutines: ptc.gather_limit(coros, limit=...)
- Relative file discovery: glob(...) or ptc.find_files(..., relative=True, relative_to=None)
- Absolute file discovery for later read()/write(): ptc.find_files_abs(..., relative=False)
Python helpers currently available in this session:
- ${callableHelperLines.join("\n- ")}
- ptc.gather_limit(coros, limit=...) -> list
- ptc.read_many(paths, max_concurrency=..., offset=None, line_limit=None) -> list[str]
- ptc.read_tree(pattern=..., path='.', max_files=1000, concurrency=..., offset=None, line_limit=None, relative=False, relative_to=None) -> list[dict[str, Any]]
- ptc.find_files(pattern='**/*', path='.', max_files=1000, relative=True, relative_to=None) -> list[str]
- ptc.find_files_abs(pattern='**/*', path='.', max_files=1000, relative=False, relative_to=None) -> list[str]
- ptc.read_text(path, offset=None, limit=None) -> str
- await ptc.batch_tool(calls, max_concurrency=None, on_error=None) -> list[Any] | dict[str, Any]
-   - on_error='collect' returns a kind="batch_partial" envelope with per-call success/error entries instead of raising on first failure
- await ptc.first_success(calls, max_concurrency=None) -> Any
- await ptc.reduce_tool(calls, reducer, initial, max_concurrency=None) -> Any
- ptc.fit_output(value, max_chars=None, max_items=None, max_depth=None) -> dict[str, Any]
- ptc.report(title, metrics=None, tables=None, samples=None, warnings=None) -> dict[str, Any]
-   - Returns kind="ptc_report" for structured repo/dataset summaries; recognized reports get compact completed-result rendering and structured details.report while free-form returns still work.
- ptc.tabulate(rows, headers=None, title=None) -> dict[str, Any]
-   - Produces a report-compatible table payload; use inside ptc.report(tables=[...]).
- ptc.diff(before, after) -> dict[str, Any]
-   - Produces a shallow JSON-safe before/after diff for explicit values.
- ptc.expect_kind(value, kind) -> Any
- ptc.list_callable_tools() -> list[dict[str, Any]]
- ptc.get_tool_schema(name) -> dict[str, Any]
- ptc.extract_handles(value, kind=None) -> list[SupportedHandle]
- ptc.first_handle(value, kind=None) -> Optional[SupportedHandle]
- ptc.json_dump(value) -> str
- Use orchestration helpers for repeated multi-tool calls, ordered fallback logic, or bounded final-output shaping.
- Use the callable tool list below directly unless your Python code needs to branch on optional tools.
Prefer these for string content:
- ptc.read_text(path) always returns str (extracts raw text from structured results)
- ptc.read_many(paths) always returns list[str]
- ptc.read_tree(pattern) returns list[dict] where each entry["content"] is str
- ptc.tabulate(...) and ptc.diff(...) are bridge helpers for report payloads and explicit before/after comparisons; prefer nu for grouping, histograms, ranking, or pipeline-style data analysis.
Use read(path) directly when you need structured anchored data (ReadResult with .lines[].anchor).
Callable tool set for this session: ${callable || "(none)"}. Use this list directly unless your Python code needs to branch on optional tools.
Example:
entries = await ptc.read_tree(pattern="**/*.ts", path="src", max_files=1000, concurrency=6)
return {
  "files": len(entries),
  "sample_lengths": [len(entry["content"]) for entry in entries[:3]],
}`;
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
    description: buildToolDescription(currentSettings, callableTools),
    promptSnippet: CODE_EXECUTION_PROMPT_SNIPPET,
    promptGuidelines: CODE_EXECUTION_PROMPT_GUIDELINES,
    parameters: Type.Object({
      code: Type.String({
        description:
          "Python code to execute. Top-level await is supported; do not call asyncio.run(...). Prefer returning a compact final result.",
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
        }

        noteCodeExecutionFailure(recoveryState);
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
