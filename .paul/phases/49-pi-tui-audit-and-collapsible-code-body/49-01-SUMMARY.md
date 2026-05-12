# Phase 49-01 Summary — Pi TUI Audit and Collapsible Code Body

## Objective

Make completed `code_execution` results debuggable by preserving the executed Python source behind Pi's existing tool-result expansion affordance, while adding a model-facing routing clarification for when to prefer `nu` versus `code_execution`.

## Result

PASS — Phase 49-01 implemented the planned collapsed/expanded completed-result rendering, prompt-guidance clarification, focused tests, audit artifact, and documentation updates.

Completed `code_execution` tool results now keep the default completed output compact while indicating that Python source is available. When the tool row is expanded, the completed result keeps the answer first and then shows a stable line-numbered `Python source` section. Partial/in-progress execution rendering still uses the existing current-line cursor view.

## Files Changed

| File | Purpose |
|------|---------|
| `.paul/phases/49-pi-tui-audit-and-collapsible-code-body/49-01-PI-TUI-AUDIT.md` | Records Pi TUI/custom-rendering audit findings and chosen implementation primitive. |
| `src/index.ts` | Adds expanded completed-result source rendering, compact collapsed source hint, keybinding-aware hint formatting via Pi TUI keybindings, and `nu` vs `code_execution` prompt guidance. |
| `test/code-execution-rendering.test.ts` | Adds focused render coverage for collapsed completed output, expanded completed output, and partial-render regression. |
| `test/prompt-guidance.test.ts` | Updates prompt metadata expectation for the `nu` vs `code_execution` split. |
| `README.md` | Documents completed-source expansion and routing guidance. |
| `CHANGELOG.md` | Records user-visible Unreleased bullets for the rendering and prompt-guidance changes. |
| `.paul/STATE.md`, `.paul/ROADMAP.md` | Records APPLY/UNIFY routing and reconciliation state. |
| `.paul/CODI-HISTORY.md`, `.paul/quality-history.md` | Post-UNIFY module side effects. |

## Acceptance Criteria

| AC | Status | Evidence |
|----|--------|----------|
| AC-1: Completed results preserve source without default noise | PASS | `test/code-execution-rendering.test.ts` asserts compact collapsed output includes telemetry/result/source-available hint and excludes full line-numbered Python source. |
| AC-2: Expanded result reveals executed Python source | PASS | Expanded render test asserts result body remains visible before a `Python source` section with stable line numbers; partial render regression confirms current-line view remains unchanged. |
| AC-3: Pi TUI primitive audit recorded before implementation decisions | PASS | `49-01-PI-TUI-AUDIT.md` records `Text`, `Markdown`, `Component.render(width)`, line-width responsibility, `renderResult(... expanded/isPartial ...)`, `keyHint`/keybinding-hint pattern, and `todo.ts` collapsed/expanded precedent. |
| AC-4: Prompt guidance clarifies `nu` versus `code_execution` | PASS | `test/prompt-guidance.test.ts` asserts active prompt guidelines prefer `nu` for pipeline-style structured-data/filesystem metadata analysis and `code_execution` for custom/stateful/multi-tool orchestration. |

## Task Results

### Task 1: Record TUI audit and add RED render/guidance tests

PASS — Created the audit artifact and added focused tests before implementation. The focused tests initially covered the missing behavior and passed after Task 2 implementation.

Verification:

```text
node --test test/code-execution-rendering.test.ts test/prompt-guidance.test.ts
# 5 passing / 0 failing after implementation
```

### Task 2: Implement expanded completed-code rendering and routing guidance

PASS_WITH_CONCERNS — Implemented the renderer and prompt-guidance changes without changing partial execution behavior or broader auto-routing semantics.

Deviation: The PLAN asked to import and use `keyHint` directly from `@mariozechner/pi-coding-agent`. Build/type export proof confirmed the symbol exists, but runtime CommonJS loading cannot safely `require()` that ESM-only package entrypoint in this package. The implementation instead uses Pi TUI `getKeybindings()` plus the active render `theme` to produce the same keybinding-aware hint shape. This preserves the product behavior and installability without adding a dependency bump or plain-text fallback.

Verification:

```text
npm run build
node --test test/code-execution-rendering.test.ts test/prompt-guidance.test.ts
```

### Task 3: Update docs and complete verification

PASS — README and CHANGELOG now describe completed-source expansion and the `nu` vs `code_execution` routing split. Full verification passed.

Verification:

```text
npm test && npm run build
# 223 tests / 0 failures; build clean
```

## Verification Summary

| Check | Result |
|-------|--------|
| `node --test test/code-execution-rendering.test.ts test/prompt-guidance.test.ts` | PASS — 5 passing / 0 failing |
| `npm run build` | PASS |
| `npm test && npm run build` | PASS — 223 passing / 0 failing, build clean |
| `npm audit --json` | Existing baseline unchanged for critical/high: 0 critical / 0 high / 3 moderate |
| Focused ESLint complexity/unused-var check on changed TS files | PASS — no ESLint issues found |
| Scope boundary review | PASS — deferred `ptc.report(...)`, path/helper ergonomics, callable-tool introspection, `ptc.run_tests(...)`, session state, read caching, persistence, and broad UI telemetry were not implemented |

## Deviations and Decisions

### Deviation: keybinding hint implementation path

- Planned: import `keyHint("app.tools.expand", "to inspect Python source")` from `@mariozechner/pi-coding-agent`.
- Actual: format an equivalent keybinding-aware hint with `getKeybindings().getKeys("app.tools.expand")` from `@mariozechner/pi-tui` and the active render `theme`.
- Reason: The package builds to CommonJS while the Pi coding-agent package entrypoint is ESM-only at runtime; direct import would risk install/runtime incompatibility even though the type/export exists.
- Impact: User-visible behavior remains aligned with Pi's keybinding-aware hint convention; the implementation avoids plain-text fallback and preserves package compatibility.

No checkpoints or user decisions were required during APPLY beyond the initial APPLY approval.

## Module Execution Reports

[dispatch] pre-unify: 0 modules registered for this hook

[dispatch] CODI post-unify: hook body entered for 49-01
[dispatch] CODI post-unify: appended injected-degraded row for 49-01

CODI appended `.paul/CODI-HISTORY.md` row:

| Plan | Date | Outcome | R | U | K | Symbols | blast_radius |
|------|------|---------|---|---|---|---------|--------------|
| 49-01 | 2026-05-12 | injected-degraded | — | — | — | renderCompletedOutput, buildToolDescription | y |

Reason: the PLAN contains the Phase 49 `### Blast Radius (CODI)` section and symbol headings, but the pre-plan log line predates the canonical `K total call-sites` parse shape. The degraded evidence still records the available blast-radius provenance.

[dispatch] RUBY: post-unify debt review completed

| File | Lines | Result |
|------|-------|--------|
| `src/index.ts` | 523 | WARN/critical file-size threshold exceeded (>500 lines); implementation stayed focused but future phases should extract renderer helpers if this file grows further. |
| `test/code-execution-rendering.test.ts` | 224 | PASS |
| `test/prompt-guidance.test.ts` | 181 | PASS |

ESLint complexity/unused-var check on changed TS files was clean. Suggested follow-up: if Phase 50 adds report rendering, extract completed-result/report render helpers instead of continuing to grow `src/index.ts`.

[dispatch] SKIP: post-unify knowledge capture completed

## [2026-05-12] Keybinding-aware expansion hint without ESM runtime import
Type: decision
Phase: 49
Context: The plan requested direct `keyHint` import from `@mariozechner/pi-coding-agent`, but this package compiles to CommonJS while the coding-agent package entrypoint is ESM-only at runtime.
Decision: Use `getKeybindings().getKeys("app.tools.expand")` from `@mariozechner/pi-tui` and the active render `theme` to produce an equivalent keybinding-aware expansion hint.
Alternatives considered: Direct `keyHint` import (rejected due CommonJS/ESM runtime incompatibility risk); plain-text hint fallback (rejected because the plan required keybinding-aware behavior); dependency/package migration (rejected as out of Phase 49 scope).
Rationale: Preserves the user-visible Pi keybinding-hint behavior while maintaining package installability and avoiding dependency churn.
Impact: Future renderer work can reuse this local hint-formatting helper or replace it if the package moves to ESM or exposes a CommonJS-compatible hint entrypoint.

[dispatch] WALT: post-unify quality history appended

| Date | Phase | Tests | Lint | Typecheck | Coverage | Trend |
|------|-------|-------|------|-----------|----------|-------|
| 2026-05-12 | 49-pi-tui-audit-and-collapsible-code-body | 223 passing / 0 failing (`npm test`) | clean via focused ESLint on changed TS files | clean via `npm run build` | n/a | ↑ improving |

## GitHub Flow

- Branch: `feature/49-pi-tui-audit-and-collapsible-code-body`
- APPLY commits pushed before UNIFY: `6e90062`, `f94c49f`
- PR: https://github.com/coctostan/pi-ptc-next/pull/5
- UNIFY will commit/push this summary and lifecycle/module artifacts before merge-gate reconciliation.

## Next Phase Note

Phase 50 remains the next Milestone 18 slice and is expected to begin the structured report-shape work (`ptc.report(...)`). Phase 49 intentionally stopped short of structured reports and only improved completed-code visibility plus prompt routing guidance.
