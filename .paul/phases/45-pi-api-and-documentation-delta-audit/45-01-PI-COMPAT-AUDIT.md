---
phase: 45-pi-api-and-documentation-delta-audit
plan: 01
artifact: PI-COMPAT-AUDIT
created: 2026-05-11
type: research
---

# Pi API and Documentation Delta Audit — Phase 45 / Plan 45-01

Audit-only research artifact comparing `pi-ptc-advanced` against the installed
local Pi package and the latest published Pi package/docs/source. No runtime,
package metadata, or public docs are modified by this artifact. Remediation
is scoped to Phase 46 (runtime), Phase 47 (prompt guidance), and Phase 48
(proof/release).

---

## 1. Evidence: Local Pi baseline, Latest published baseline, and Project baseline

### 1.1 Local installed Pi baseline (the `pi` binary the user actually runs in chat)

- Binary symlink: `/opt/homebrew/bin/pi -> ../lib/node_modules/@earendil-works/pi-coding-agent/dist/cli.js`
- Package: `@earendil-works/pi-coding-agent`
- Version: **`0.74.0`** (`/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/package.json`)
- Repo: `git+https://github.com/earendil-works/pi-mono.git` (directory: `packages/coding-agent`)
- Exports: `.` and `./hooks` (built-in tools, extension types, TUI components, SDK).
- Bundled docs consulted directly from this install:
  - `docs/extensions.md` (2596 lines)
  - `docs/sdk.md` (1149 lines)
  - `docs/prompt-templates.md` (88 lines)
  - `docs/tui.md` (918 lines)
  - `CHANGELOG.md` (4164 lines)
  - Examples: `examples/extensions/prompt-customizer.ts`, `dynamic-tools.ts`,
    `tool-override.ts`, `hello.ts`, `todo.ts`, `structured-output.ts`,
    `subagent/`, `plan-mode/`.
- Strongly-typed extension surface inspected:
  - `/opt/homebrew/lib/node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts`
    (`ExtensionAPI`, `ToolDefinition`, `ToolInfo`, `SourceInfo`,
    `BuildSystemPromptOptions`, `BeforeAgentStartEvent`).

### 1.2 Latest published Pi baseline (npm)

- `npm view @earendil-works/pi-coding-agent version dist-tags time --json`:
  ```json
  {
    "version": "0.74.0",
    "dist-tags": { "latest": "0.74.0" },
    "time": {
      "created":  "2026-05-07T15:15:48.400Z",
      "0.74.0":   "2026-05-07T15:15:48.756Z",
      "modified": "2026-05-07T15:15:48.994Z"
    }
  }
  ```
- `@earendil-works/pi-coding-agent@latest` only has a single published version,
  `0.74.0`, on 2026-05-07. The local install (`0.74.0`) **equals** the latest
  published baseline. Per plan boundary, the locally-installed Pi docs are
  therefore the executable latest baseline for this audit; no additional
  remote doc/source mirror is required.
- Cross-reference: `npm view @mariozechner/pi-coding-agent version dist-tags`
  returns `0.73.1` / `latest: 0.73.1`. The `@mariozechner/*` scope is no longer
  the current release channel — the `@earendil-works/*` scope (per Pi 0.74.0
  CHANGELOG: "Updated repository links and package references for the move to
  `earendil-works/pi-mono` and `@earendil-works/*` package scopes") is canonical.
  See **Finding R-1** below.

### 1.3 Project baseline (`pi-ptc-advanced`)

- `package.json`:
  - `name: pi-ptc-advanced`
  - `version: 0.15.0`
  - `pi.extensions: ./src/index.ts`
  - `peerDependencies: { "@mariozechner/pi-coding-agent": "*" }`
  - `dependencies: { "@mariozechner/pi-tui": "^0.55.1", "@sinclair/typebox": "^0.34.41" }`
- Build-time `node_modules` resolution:
  - `@mariozechner/pi-coding-agent@0.55.1` (installed for type-checking)
  - `@mariozechner/pi-tui@0.55.1`
- Source-import surface (`grep -oE "@[a-z-]+/[a-z-]+" src/`):
  - `@mariozechner/pi-coding-agent`
  - `@mariozechner/pi-tui`
  - `@sinclair/typebox`
- The extension never imports `@earendil-works/*` directly. At runtime under
  the current Pi binary, the extension is loaded by Pi 0.74.0 even though the
  imports are spelled against the legacy `@mariozechner/*` peer.

### 1.4 Evidence sources reused throughout this audit

When this document writes "Pi docs", it refers to the bundled docs in the
installed `0.74.0` package directory above. When it writes "Pi types", it
refers to `dist/core/extensions/types.d.ts` in the same install. When it
writes "Pi 0.55.1 types", it refers to the build-time
`@mariozechner/pi-coding-agent@0.55.1` in `node_modules/`.

---

## 2. Compatibility Matrix

Status legend:

- `compatible` — current usage works as documented in Pi 0.74.0 and is consistent with both the build-time peer and the runtime install.
- `upgrade-candidate` — current usage works, but the latest Pi exposes a newer/better API the extension should adopt or document.
- `risk` — current usage assumes types/shapes that drift between the build-time peer and the runtime install, or relies on private bridges; behavior can regress without a Pi-side breaking change.
- `defer` — known compatibility friction documented for later phases; not actionable in Phase 45.

| # | Area | Project usage (file:line / evidence) | Latest Pi guidance (evidence) | Status | Note |
|---|---|---|---|---|---|
| M-1 | Package/import namespace | `package.json:64` `peerDependencies: { "@mariozechner/pi-coding-agent": "*" }`; `src/**` imports `@mariozechner/pi-coding-agent` and `@mariozechner/pi-tui` only (`grep -oE "@[a-z-]+/[a-z-]+" src/`). | CHANGELOG `0.74.0`: "Updated repository links and package references for the move to `earendil-works/pi-mono` and `@earendil-works/*` package scopes." Latest dist-tag = `@earendil-works/pi-coding-agent@0.74.0`. `@mariozechner/*` latest = `0.73.1`. | risk | Project's name resolution still depends on a now-secondary npm scope. The runtime install is `@earendil-works/*`; the build-time peer is the renamed `@mariozechner/*` 0.55.1 (older API surface). Surface drift between build-time and runtime is what gates several other rows below. See **Finding R-1**. |
| M-2 | `pi.registerTool()` definition shape — required fields | `src/custom-tool-manager.ts:9-18` returns only `{name, label, description, parameters, execute, ptc}`; `src/index.ts:166-230` `buildCodeExecutionTool()` returns the same baseline shape plus `renderResult`. | `docs/extensions.md` "Tool Definition" + `types.d.ts:328-358` `ToolDefinition` accepts `name, label, description, parameters, execute, renderCall, renderResult, promptSnippet, promptGuidelines, renderShell, prepareArguments, executionMode`. | compatible | All Pi-required fields are present and typed correctly. |
| M-3 | `promptSnippet` (one-line `Available tools` entry) | Not used by `code_execution` (`src/index.ts:166-230`) or by `CustomToolManager.buildRegisteredTool` (`src/custom-tool-manager.ts:9-18`). | `docs/extensions.md:1664-1666` "Use `promptSnippet` for a short one-line entry in the `Available tools` section in the default system prompt. If omitted, custom tools are left out of that section." | upgrade-candidate | `code_execution` is the headline custom tool; without `promptSnippet` it is **omitted from the Available tools section of the default system prompt** in Pi ≥ ~0.50. The current 3KB `description` is shown only inside the tool catalog, not in the top-of-prompt "Available tools" listing. Phase 47 candidate. |
| M-4 | `promptGuidelines` (active-only guideline bullets) | Not used. The recovery/auto-route prompt addition in `src/index.ts:277-281` is appended at `before_agent_start` time via raw `systemPrompt` string concatenation. | `docs/extensions.md:1666-1668` `promptGuidelines: string[]` "These bullets are included only while the tool is active". Bullets are flattened into the default Guidelines section. | upgrade-candidate | A subset of the "Prefer these patterns" / "Use code_execution when..." rules currently embedded in the tool description are guideline-shaped and would survive auto-route on/off and built-in-tools mode toggles more cleanly via `promptGuidelines`. Phase 47 candidate. |
| M-5 | `pi.getActiveTools()` / `pi.setActiveTools()` | `src/index.ts:264-275, 285-294` auto-routes by snapshotting and replacing the active tools, then restores on `agent_end`. | `docs/extensions.md:1483-1505` documents `getActiveTools / getAllTools / setActiveTools`. `types.d.ts:855,857,859` confirm signatures. | compatible | Behavior matches docs. Snapshot/restore is the documented pattern. |
| M-6 | `pi.getAllTools()` return shape — `sourceInfo` vs internal `source` | `src/tool-registry.ts:336-373` consumes `pi.getAllTools()`; project's internal `ToolInfo` (`src/contracts/tool-types.ts:71-76`) declares `source: "builtin" \| "alias" \| "extension"`. The project's `extensionExecutors` and `customTools` are tagged with the internal `source` string. The extension does not read `sourceInfo` from Pi's `ToolInfo`. | Latest Pi `ToolInfo` (`types.d.ts:1034-1036`): `Pick<ToolDefinition, "name" \| "description" \| "parameters"> & { sourceInfo: SourceInfo }`. Build-time peer 0.55.1 `ToolInfo` (`node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts:870`): `Pick<ToolDefinition, "name" \| "description" \| "parameters">` (no `sourceInfo`). CHANGELOG (line ~874-906 of bundled `CHANGELOG.md`): "Unified source provenance via `sourceInfo`. … Added structured `sourceInfo` to `pi.getAllTools()` results for built-in, SDK, and extension tools." | risk | The build-time peer types do not include `sourceInfo`, but the runtime `getAllTools()` does. Today this is benign because the project never reads `sourceInfo`. It is risk-flagged because (a) `sourceInfo` is now the documented canonical provenance field, (b) the project's `source` field collides with Pi's `sourceInfo.source` semantics, and (c) any future attempt to upgrade the peer (Finding R-1) without resolving the field collision can quietly break callable-tool classification. Phase 46 candidate. |
| M-7 | Active tool discovery & override merging | `src/tool-registry.ts:307-376` `buildToolMap()` merges built-ins, extension executors, custom tools, and `pi.getAllTools()` results, then takes Pi's `execute` only when `pi.getActiveTools()` says the tool is active. | `docs/extensions.md:1824-1845` documents built-in override semantics. `docs/extensions.md:1841` "Built-in renderer inheritance is resolved per slot." | compatible | The logic is consistent with Pi guidance. The conditional "shouldUsePiOverride = activeToolNames.has(piTool.name)" preserves Pi's override path for active tools while keeping built-in execute as a safe default for tools Pi gates off. |
| M-8 | `prepareArguments` hook awareness | Not used; nothing in `src/**` references the field. | `docs/extensions.md:1777-1822` documents `prepareArguments(args)` as the recommended compatibility shim when a session contains old tool-call argument shapes. Available since Pi ≥ ~0.69 (CHANGELOG ~line 770). | defer | The extension currently exposes a single, stable `code_execution` schema with only one field (`code: string`). There is no historical drift to absorb. Recorded for future schema evolution; no Phase 46 action required unless `code_execution` schema changes. |
| M-9 | `terminate: true` (early-termination hint) | Not used. | `docs/extensions.md:1763-1776` and bundled `examples/extensions/structured-output.ts`. Added Pi 0.69.x (CHANGELOG line 324/334). | defer | `code_execution` is typically followed by an LLM follow-up turn; ending the agent loop after `code_execution` would change the user-visible product contract. Keep as future ergonomic option for explicit "final result" PTC patterns, not a Phase 46 candidate. |
| M-10 | `executionMode` per-tool override | Not used; falls back to default. | `types.d.ts:349-356` `executionMode?: ToolExecutionMode = "sequential" \| "parallel"`. | defer | `code_execution` already serializes its own work via the Python RPC runtime, and PTC nested tool calls are sequential by design. Default mode is correct; no action. |
| M-11 | `renderCall` / `renderResult` / `renderShell` | `src/index.ts:211-228` provides `renderResult` only; `renderCall` is not defined; `renderShell` is not set (defaults to "default"). Built-in `Text` from `@mariozechner/pi-tui` is used. | `docs/extensions.md:1977-2098` documents renderer slot inheritance and the `Component.render(width)` contract. `docs/tui.md:24` "`render(width)`: Return array of strings (one per line). Each line **must not exceed `width`**." | compatible | `Text(..., 0, 0)` follows the documented contract; lines emitted via `theme.fg(...)` are width-bounded by the TUI layout. No regression risk vs latest Pi. |
| M-12 | `before_agent_start.systemPromptOptions` | `src/index.ts:337-353` `handleBeforeAgentStart()` reads `event.prompt` and `event.systemPrompt`; ignores `event.systemPromptOptions`. | `docs/extensions.md:466-497` documents `systemPromptOptions` with fields `customPrompt`, `selectedTools`, `toolSnippets`, `promptGuidelines`, `appendSystemPrompt`, `cwd`, `contextFiles`, `skills`. Pi 0.69.x added it (CHANGELOG ~line 374-387). | upgrade-candidate | Auto-routing currently appends to `event.systemPrompt` blind. Reading `systemPromptOptions.selectedTools` and `.toolSnippets` would let the extension confirm `code_execution` is in the prompt before injecting routing guidance and would let Phase 47 deduplicate against guidelines that already exist. Phase 47 candidate. |
| M-13 | `context` event | `src/index.ts:355-363` `handleContext()` uses a hand-rolled cast `(pi as unknown as { on(event: "context", ... ) })` to attach the handler. | `types.d.ts:794` `on(event: "context", handler: ExtensionHandler<ContextEvent, ContextEventResult>)` — `context` is a first-class typed event in Pi 0.74.0 (and was in 0.55.1 too, per `node_modules/@mariozechner/pi-coding-agent/dist/core/extensions/types.d.ts`). | risk | The unsafe cast suggests the project's local `ExtensionAPI` typing was missing the `context` overload at the time the cast was written. Both the build-time peer (0.55.1) and the runtime install (0.74.0) declare the overload. The cast is no longer required and currently masks any type-level regression Pi might introduce. Phase 46 candidate (remove the cast). |
| M-14 | `before_provider_request` | Not used. | `docs/extensions.md:601-620` documents the hook. | defer | No current need; `code_execution` does not rewrite provider payloads. |
| M-15 | Hashline/native-interop bridge (`globalThis.__hashlineToolExecutors` + `pi.events.on("hashline:tool-executors", ...)`) | `src/tool-registry.ts:122-158` `ToolRegistry` constructor + `ingestExtensionExecutors()`. Code comment: "Bridge: consume hashline tool executors. Remove when pi exposes getToolExecutor() on ExtensionAPI." | Latest Pi `types.d.ts` does not expose a public `pi.getToolExecutor()` or any documented executor-handoff API. `pi.events` is exposed (`docs/extensions.md:1532` and types) but `hashline:tool-executors` is a project/inter-extension convention, not a Pi event. | risk | The bridge depends on a sibling extension or test harness emitting `hashline:tool-executors` via Pi's event bus or pre-emitting on `globalThis`. If Pi (a) tightens `pi.events` to a typed-only contract, (b) sandboxes extensions from `globalThis`, or (c) ever ships `getToolExecutor()`, this bridge silently degrades to "no extension executors merged". Documented as a known boundary; STATE already lists it as a deferred issue. Keep as Phase 46 candidate to add at minimum a one-time visibility warning + Phase 48 release-note language. |
| M-16 | Built-in tool factories — import surface | `src/tool-registry.ts:1-10` imports `createReadTool, createBashTool, createEditTool, createFindTool, createGrepTool, createLsTool, createWriteTool` from `@mariozechner/pi-coding-agent`. | Latest Pi `dist/index.d.ts:21` re-exports the same factories under `@earendil-works/pi-coding-agent` (`createBashTool, createEditTool, createFindTool, createGrepTool, createLsTool, createReadTool, createWriteTool`). Build-time peer (`@mariozechner/pi-coding-agent@0.55.1`) also exports the same set. | compatible | Factory names and signatures are stable across both scopes; the alias-style "glob" override in `tool-registry.ts:295-302` continues to be valid. |
| M-17 | TUI components (`Text`, `Component`) | `src/index.ts:3` `import { Text, type Component } from "@mariozechner/pi-tui"`. Used at lines 54, 59, 69. | `docs/tui.md` describes the same `Text` / `Component` API in latest Pi. `@mariozechner/pi-tui@0.55.1` and `@earendil-works/pi-tui@0.74.0` (referenced indirectly through Pi 0.74.0) expose matching `Text(text, padLeft, padRight)` signatures. | compatible | No render contract drift observed. |
| M-18 | `pi.events.on(...)` | `src/tool-registry.ts:136` `pi.events.on("hashline:tool-executors", ...)`. | `docs/extensions.md:1532-1540` documents `pi.events` as a public typed event bus and `types.d.ts` exports `EventBus`. | compatible-but-coupled | The API exists and works; the coupling concern is M-15 (the channel name), not the `events.on` surface itself. |

---

## 3. System Prompt and Tool Guidance Findings

This section focuses on AC-3: prompt-integration opportunities and Phase 47-ready
recommendations.

### 3.1 Current prompt-integration surface

- `code_execution.description` (`src/index.ts:78-134`) is a ~2.7 KB block
  containing strong-signal usage rules, important runtime rules, preferred
  patterns, runtime-derived helper signatures, callable tool set, and an
  example. Today this entire block lives in Pi's per-tool description, not in
  the system prompt's "Available tools" one-liner section.
- `applyAutoRouting()` (`src/index.ts:245-282`) appends a single sentence to
  `event.systemPrompt` when a prompt is auto-routed to `code_execution`.
- `handleBeforeAgentStart()` (`src/index.ts:337-353`) does not consult
  `event.systemPromptOptions`.
- `CustomToolManager.buildRegisteredTool()` (`src/custom-tool-manager.ts:9-18`)
  passes through user-supplied tool definitions but does not threadthrough
  `promptSnippet` / `promptGuidelines` even if a user-authored custom tool
  declared them.

### 3.2 Findings (Phase 47-ready)

- **P-1 — Add `promptSnippet` to `code_execution`.** Without it, the tool is
  invisible in the default system prompt's "Available tools" section
  (`docs/extensions.md:1664-1666`). A one-line snippet is the highest-leverage
  prompt-integration change because it surfaces the tool in the section the LLM
  actually scans first, and it is independent of auto-routing.
- **P-2 — Promote a small set of `code_execution` "use-when" rules to
  `promptGuidelines`.** Bullets like "Use code_execution for repo-wide
  analysis, repeated lookups, or any task with 3+ dependent tool calls" and
  "Use direct tools for one-file reads or one-off grep/find calls" follow the
  active-tool guidance contract perfectly. Per `docs/extensions.md:1227,1668`,
  guidelines must name the tool explicitly (no "this tool when…"). The current
  description text already names `code_execution` explicitly, so the migration
  is mechanical.
- **P-3 — Keep deep operational rules in `description`.** The runtime-derived
  helper signatures (e.g. `read(path: str, *, offset…)`), the callable tool
  set line, and the `code_execution` invocation example are tied to per-session
  runtime metadata. They belong in `description`, not in `promptSnippet` /
  `promptGuidelines`. Treat the description as the "deep" surface and prompt
  metadata as the "shallow" surface.
- **P-4 — Read `event.systemPromptOptions` in `before_agent_start`.**
  Auto-routing currently appends to `event.systemPrompt` without checking
  whether `code_execution` is in `selectedTools` or whether a similar
  guideline already exists in `promptGuidelines`. After P-1/P-2 land, the
  auto-route patch should be smaller (often unnecessary) because the
  default-system-prompt path will already include the routing intent.
- **P-5 — Thread `promptSnippet` / `promptGuidelines` through
  `CustomToolManager.buildRegisteredTool`.** Today user-authored custom tools
  that declare these fields lose them at the registration boundary
  (`src/custom-tool-manager.ts:9-18` returns only six fields). A two-field
  copy-through restores parity with `pi.registerTool` directly. Treat as
  Phase 47 follow-on; the project owns the omission, not Pi.
- **P-6 — No change needed for `before_provider_request` or `terminate`.**
  Current product semantics expect an LLM follow-up turn after
  `code_execution`; using `terminate: true` would change observable behavior
  in a way that is out of scope for Milestone 17.

### 3.3 Explicit non-findings (so Phase 47 does not re-litigate them)

- Theming, autocomplete providers, custom commands, custom editors, status
  widgets, footers — all Pi 0.74.0 capabilities — are out of `pi-ptc-advanced`'s
  product scope. No prompt-integration finding here is contingent on adopting
  them.
- `prepareArguments` is unnecessary today because `code_execution`'s schema is
  stable (single `code: string` field).

---

## 4. Bounded Remediation Handoff

### 4.1 Phase 46 Runtime alignment candidates

| ID | Recommendation | Rationale | Expected files | Verification strategy |
|---|---|---|---|---|
| 46-A | Resolve build-time peer drift against `@earendil-works/pi-coding-agent`. Either bump `peerDependencies` to `@earendil-works/pi-coding-agent` (and update `@mariozechner/pi-tui` to `@earendil-works/pi-tui`), keep `@mariozechner/*` only as a transitional alias, or document the mismatch explicitly. | M-1: build-time peer is `@mariozechner/*@0.55.1` while runtime is `@earendil-works/*@0.74.0`. Multiple risk rows (M-6, M-13) cascade from this. | `package.json`, `package-lock.json`, `src/**` import paths if scope is switched, README/maintainer docs (Phase 47), CHANGELOG entry (Phase 48). | `npm install` clean, `npm run build` clean, `npm test` baseline (currently 207 pass / 0 fail), targeted import-resolution test. |
| 46-B | Remove `(pi as unknown as { on(event: "context", … ) })` cast at `src/index.ts:421`. Use the typed `on("context", …)` overload directly. | M-13: both build-time peer 0.55.1 and runtime 0.74.0 declare the typed overload. The cast hides any future type regression and is no longer required. | `src/index.ts`. | `npm run build`, focused TS diagnostic check on the changed lines, `npm test`. |
| 46-C | Add a one-time visibility warning when the hashline executor bridge sees no executors at session start, and document the bridge boundary in a focused internal comment near `ToolRegistry`'s constructor. | M-15: the bridge silently degrades if Pi tightens `pi.events` or sandboxes `globalThis`; today there is no signal that the bridge "did nothing". | `src/tool-registry.ts`, optional `src/utils.ts` log helper. | `npm test`, focused regression test that asserts the warning path fires when no executors are emitted. |
| 46-D | Decide on `sourceInfo` adoption strategy. Either keep the internal `source: "builtin" \| "alias" \| "extension"` taxonomy and add a deliberate `sourceInfo` ignore comment, or migrate internal `ToolInfo` to read `piTool.sourceInfo.source` for Pi-supplied tools. | M-6: Pi's canonical provenance is `sourceInfo`; the project's internal taxonomy collides on the literal field name `source`. | `src/contracts/tool-types.ts`, `src/tool-registry.ts`, `src/tools/python-tool-contract.ts`. | `npm run build`, focused `tool-registry` test, `npm test`. |

### 4.2 Phase 47 Prompt and tool-guidance candidates

| ID | Recommendation | Rationale | Expected files | Verification strategy |
|---|---|---|---|---|
| 47-A | Add `promptSnippet` to the `code_execution` tool definition. | P-1: without it the tool is omitted from the default system prompt's "Available tools" listing. | `src/index.ts` (`buildCodeExecutionTool`). | Focused test asserting the registered tool has a non-empty `promptSnippet`; `npm run build`; manual interactive sanity check is optional. |
| 47-B | Move a small, well-formed subset of "use code_execution when…" rules from `description` into `promptGuidelines` (bullets that name the tool explicitly). | P-2: these are active-only rules that survive `setActiveTools` toggling cleanly and respect the documented guideline contract. | `src/index.ts`. | Focused test asserting bullet content, no per-tool description regression in callable surface tests. |
| 47-C | Have `applyAutoRouting()` consult `event.systemPromptOptions.selectedTools` (and optionally `.promptGuidelines`) before injecting routing text. | P-4: avoids duplicate routing text after 47-A/47-B land, and respects user-supplied `--system-prompt` overrides better. | `src/index.ts`. | Focused test on `handleBeforeAgentStart` that feeds a stub `event.systemPromptOptions`. |
| 47-D | Thread `promptSnippet` / `promptGuidelines` through `CustomToolManager.buildRegisteredTool` so user-authored custom tools keep their prompt metadata. | P-5: parity with raw `pi.registerTool`. | `src/custom-tool-manager.ts`. | Focused test on a synthetic tool definition with `promptSnippet` and `promptGuidelines`. |
| 47-E | Maintainer-doc update describing the new prompt-integration story (snippet + guidelines + auto-route) and the build-time peer alignment decision from Phase 46. | Keeps README/CHANGELOG honest about externally visible behavior. | `README.md`, `CHANGELOG.md` (under "Unreleased"). | DOCS module dispatch, `npm run verify:personal`. |

### 4.3 Phase 48 Proof and release-readiness candidates

| ID | Recommendation | Rationale | Expected files | Verification strategy |
|---|---|---|---|---|
| 48-A | Bake a regression test that ensures `code_execution` is visible in the default Pi system prompt path (via `promptSnippet` presence) and that auto-routing remains idempotent. | Locks in the visible product change from 47-A / 47-C. | `test/index.test.ts` or a focused companion file (preferred — see STATE Deferred Issues on `test/index.test.ts` hotspot). | `npm test` with the new test included. |
| 48-B | Confirm `npm pack --dry-run` and `verify:release-package` still pass on the new baseline; record any audit-baseline interactions with DEAN. | Milestone 16 already established the publish-readiness baseline; Milestone 17 must not regress it. | None expected; verification-only. | `npm run verify:release-package`, `npm run verify:ci`. |
| 48-C | Release-note language: "Adopted Pi 0.74.0 prompt metadata APIs (promptSnippet/promptGuidelines/systemPromptOptions) for `code_execution`; build-time peer aligned to current Pi scope." | Phase 48 owns the changelog and release verification. | `CHANGELOG.md`, `docs/releases/*` if used. | DOCS module dispatch. |

### 4.4 Deferrals and explicit risks

| ID | Item | Why deferred |
|---|---|---|
| D-1 | `terminate: true` for `code_execution`. | Changes observable agent loop behavior; out of Milestone 17 scope. |
| D-2 | `executionMode: "parallel"` for callable surface. | PTC nested calls are sequential by contract; no current motivation. |
| D-3 | `prepareArguments` for `code_execution`. | Schema is stable; nothing to migrate. |
| D-4 | Adopting Pi 0.74.0 ecosystem APIs unrelated to PTC (custom autocomplete, custom editor, dialogs, footer/status widgets, custom compaction, sub-agents). | Out of product scope for `pi-ptc-advanced`. |
| D-5 | Removing the `hashline:tool-executors` bridge entirely. | STATE already lists "Bridge teardown when pi adds `getToolExecutor()`" as a deferred issue; latest Pi (0.74.0) still does not expose that API. |
| D-6 | DEAN dependency-risk remediation. | User-approved override and baseline at `.paul/dean-baseline.json`; Phase 45 is audit-only. |

### 4.5 Top-level findings summary

- **Finding R-1 (M-1)** — Build-time peer drift between `@mariozechner/*@0.55.1`
  and runtime `@earendil-works/*@0.74.0` is the gating risk. It is the parent
  of M-6 and M-13. Decide its disposition first in Phase 46.
- **Finding R-2 (M-3, M-4)** — `code_execution` is currently invisible in the
  default system prompt's "Available tools" section. P-1 + P-2 give the
  largest model-behavior delta for the smallest code change.
- **Finding R-3 (M-15)** — The hashline executor bridge remains the most
  fragile cross-extension surface. Add an observability signal in Phase 46
  before any larger refactor.
- **Findings on the rest of the matrix** — Compatible or defer; no immediate
  Pi-side breakage observed.

---

## 5. Boundaries enforced by this audit

- No runtime source under `src/**` was modified.
- No package metadata (`package.json`, `package-lock.json`) was modified.
- No release scripts or CI workflows were modified.
- No installed Pi package under `/opt/homebrew/lib/node_modules/...` was modified.
- DEAN dependency baseline was not touched.

## 6. Evidence-gap notes

- The local install of Pi (`@earendil-works/pi-coding-agent@0.74.0`) equals
  the latest published version per `npm view` (Section 1.2). The plan
  explicitly allows treating installed docs as the latest baseline in that
  case, and no remote doc/source fetch was required for this audit.
- The build-time peer `@mariozechner/pi-coding-agent@0.55.1` was consulted
  through `node_modules/.../dist/core/extensions/types.d.ts` directly.
- No `npm view` failure was observed.
