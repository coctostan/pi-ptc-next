# Phase 49 Pi TUI Audit — Collapsible `code_execution` Source

## Scope

Phase 49 needs completed `code_execution` results to remain compact by default while preserving the executed Python source for post-run debugging through Pi's existing tool expansion affordance.

## Findings

### TUI component primitives (`docs/tui.md`)

- Pi TUI components implement `render(width): string[]`; every returned line is responsible for staying within the provided width.
- `Text` is the smallest useful primitive for multi-line text output and is appropriate when the default tool-result `Box` should continue to provide shell/padding.
- `Markdown` can render richer prose/code blocks, but this phase only needs stable plain text and line numbers, so `Text` avoids unnecessary renderer complexity.
- Components can cache render output and clear caches in `invalidate()`; this phase can stay stateless and compute text on each `renderResult` call.
- Theme colors should come from the `theme` callback passed to `renderResult`, not imported global state.

### Custom tool rendering contract (`docs/extensions.md`)

- Tools may define `renderResult(result, { expanded, isPartial }, theme, context)` and must return a `Component`.
- Tool rows are boxed by Pi by default; `renderShell: "self"` is only needed when a tool owns its full frame/background. Phase 49 should keep the default shell.
- `isPartial` should continue to drive streaming/progress rendering.
- `expanded` is the intended mechanism for detail on demand; best practices explicitly say to support `expanded` and keep the default view compact.
- `keyHint("app.tools.expand", "to inspect Python source")` is the Pi-provided way to show expansion hints that respect active keybindings.

### Example pattern (`examples/extensions/todo.ts`)

- The `todo` example's `renderResult(result, { expanded }, ...)` shows a bounded list in the collapsed view and the full list when expanded.
- The same pattern maps directly to `code_execution`: show summary/result and a source-available hint when collapsed; show summary/result plus full Python source when expanded.

### Installed/runtime caveat

- This repository still targets Mario-scoped packages (`@mariozechner/*@0.73.1`), not the newer Earendil package names used by current docs.
- APPLY must verify imports/types locally. Planning confirmed `keyHint` is exported from `@mariozechner/pi-coding-agent`; build verification remains the authority.

## Chosen implementation primitive

Use the existing `renderResult` hook and return a `Text` component:

1. Keep `isPartial` on the existing `renderExecutingCode(...)` path so live current-line rendering is unchanged.
2. For completed collapsed results, render telemetry summary and result body first, then a muted `Python source: N lines (...)` hint.
3. For completed expanded results, render telemetry summary and result body first, then a `Python source` section with stable line-numbered Python source.
4. Avoid a custom component, custom shell, persistent code log, read cache, or structured report renderer in this phase.
