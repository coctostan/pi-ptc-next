---
phase: 52-callable-tool-introspection
plan: 01
subsystem: python-runtime
tags:
  - callable-tools
  - prompt-metadata
  - ptc-help
  - introspection
requires:
  - phase: 47-system-prompt-and-tool-guidance-optimization
    provides: Pi/native `promptSnippet` and `promptGuidelines` metadata convention
  - phase: 51-path-ergonomics-and-bridge-helpers
    provides: focused helper-surface proof and prompt-guidance contract pattern
provides:
  - Optional callable-tool prompt metadata propagated into Python metadata
  - `ptc.help(tool_name)` runtime helper for bounded on-demand tool guidance
  - README, CHANGELOG, and generated `code_execution` guidance alignment for on-demand introspection
affects:
  - Phase 53 Test Runner Verb
  - Python callable-tool helper surface
tech-stack:
  added: []
  patterns:
    - Optional prompt metadata remains absent unless provided by the host/custom tool
    - Runtime helper metadata can be inspected on demand without expanding the generated tool-description inventory
key-files:
  created:
    - .paul/phases/52-callable-tool-introspection/52-01-SUMMARY.md
  modified:
    - src/contracts/tool-types.ts
    - src/tools/python-tool-contract.ts
    - src/tools/tool-wrapper.ts
    - src/python-runtime/runtime.py
    - src/index.ts
    - README.md
    - CHANGELOG.md
    - test/callable-tool-introspection-helper.test.ts
    - test/callable-tool-introspection-contract.test.ts
    - test/prompt-guidance.test.ts
    - test/index.test.ts
    - test/tool-wrapper.test.ts
key-decisions:
  - "Decision: `ptc.help(tool_name)` returns the full selected callable metadata, including `parameters`, while `ptc.get_tool_schema(...)` remains schema-only."
  - "Decision: Keep `ptc.help(...)` documented as an on-demand helper for optional-tool choice, not a routine prelude."
patterns-established:
  - "Pattern: callable-tool prompt metadata is optional and only emitted when non-empty."
  - "Pattern: generated guidance should mention `ptc.help(...)` only for targeted metadata needs."
duration: same-day apply/unify
started: 2026-05-12T18:30:49Z
completed: 2026-05-12T19:25:00Z
---

# Phase 52 Plan 01: Callable-Tool Introspection Summary

Phase 52 shipped optional callable-tool prompt metadata into the Python helper surface and added `ptc.help(tool_name)` as a bounded, on-demand guidance helper without changing callable execution semantics.

## Performance

| Metric | Value |
|--------|-------|
| Duration | Same-day APPLY + UNIFY |
| Started | 2026-05-12T18:30:49Z |
| Completed | 2026-05-12T19:25:00Z |
| Tasks | 3 completed |
| Files modified | 12 implementation/test/doc files plus PALS lifecycle artifacts |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Callable metadata preserves optional prompt fields | PASS | `buildPythonCallableToolMetadata(...)` now includes `promptSnippet` and `promptGuidelines` only when present/non-empty; runtime tests prove tools without prompt metadata omit those fields. |
| AC-2: `ptc.help(tool_name)` returns bounded runtime guidance | PASS | `_PtcHelpers.help(...)` resolves canonical tool names and Python aliases, returns a JSON-safe clone of callable metadata including parameters/source/read-only fields, and preserves the bounded unknown-tool error style. |
| AC-3: Existing schema/introspection behavior remains compatible | PASS | `ptc.list_callable_tools()` remains backward compatible and `ptc.get_tool_schema(...)` still returns only the parameter schema. |
| AC-4: Docs and prompt guidance keep introspection on-demand | PASS | README, generated `code_execution` guidance, and CHANGELOG document `ptc.help(...)` as targeted optional-tool metadata lookup and preserve guidance against unconditional introspection. |

## Module Execution Reports

### Pre-UNIFY Dispatch

[dispatch] pre-unify: 0 modules registered for this hook.

### WALT — Quality Delta

[dispatch] WALT post-unify: quality history appended for Phase 52.

| Metric | Before | After | Delta | Trajectory |
|--------|--------|-------|-------|------------|
| Tests | 230 passing / 0 failing | 230 passing / 0 failing (`npm test`) | 0 failures | → stable |
| Typecheck | clean via `npm run build` | clean via `npm run build` | no regression | → stable |
| Lint | no project lint script | clean focused ESLint complexity pass on changed TS/test files | no issues found | → stable |
| Coverage | n/a | n/a | n/a | — |
| Dependency audit | 0 critical / 0 high / 3 moderate | 0 critical / 0 high / 3 moderate | no critical/high regression | → stable |

Verification rerun during UNIFY: `npm test && npm run build && npm audit --json` produced 230 passing / 0 failing and clean TypeScript build; `npm audit --json` exited non-zero because the unchanged moderate advisory baseline remains 3 moderate / 0 high / 0 critical.

### CODI — Dispatch History

[dispatch] CODI post-unify: hook body entered for 52-01.
[dispatch] CODI post-unify: skipped — no CODI dispatch line found.

No canonical CODI pre-plan success/skip line or degraded blast-radius evidence was present in the PLAN `<module_dispatch>` region, so `.paul/CODI-HISTORY.md` records `no-dispatch-found` for 52-01.

### RUBY — Refactor/Debt Review

[dispatch] RUBY post-unify: focused ESLint complexity check clean; line-count hotspot warnings carried forward.

| File | Signal | Result |
|------|--------|--------|
| `src/contracts/tool-types.ts` | line count | 100 — OK |
| `src/tools/python-tool-contract.ts` | line count | 320 — WARN hotspot threshold exceeded, but focused change remained local |
| `src/tools/tool-wrapper.ts` | line count | 181 — OK |
| `src/python-runtime/runtime.py` | line count | 1089 — WARN existing runtime hotspot; avoid casual growth in Phase 53 |
| `src/index.ts` | line count | 534 — WARN existing prompt/extension hotspot |
| `test/index.test.ts` | line count | 1222 — WARN existing test hotspot; continue using focused companion tests |
| `README.md` | line count | 899 — WARN docs hotspot; keep future docs compact |

### SKIP — Knowledge Capture

[dispatch] SKIP post-unify: captured reusable decisions/lessons from the summary.

#### Decision Record — `ptc.help(...)` returns full callable metadata

- **Date:** 2026-05-12
- **Type:** decision
- **Phase:** 52
- **Context:** Agents need targeted runtime guidance for optional callable tools without inflating the static `code_execution` tool description.
- **Decision:** `ptc.help(tool_name)` returns the selected callable metadata object, including prompt metadata when present, `parameters`, `source`, and `isReadOnly`; `ptc.get_tool_schema(...)` remains parameter-schema only.
- **Alternatives considered:** Expand `get_tool_schema(...)` to include all metadata (rejected as breaking/ambiguous); dump all prompt metadata into generated guidance (rejected as prompt bloat).
- **Rationale:** A separate helper preserves compatibility and gives agents one targeted lookup when deciding whether/how to call an optional tool.
- **Impact:** Future helper additions should preserve schema-only `get_tool_schema(...)` behavior and put richer guidance behind explicit on-demand helpers.

#### Lesson Learned — Keep helper docs on-demand

- **Date:** 2026-05-12
- **Type:** lesson
- **Phase:** 52
- **What happened:** README and generated guidance needed to mention `ptc.help(...)` without encouraging every script to call introspection first.
- **Root cause:** Richer helper metadata can easily become prompt/tool-description bloat if surfaced unconditionally.
- **Lesson:** Document on-demand introspection helpers with explicit “use when needed” language and preserve the short callable-tool inventory in the static tool description.
- **Action items:** Carry this guidance into Phase 53 when adding `ptc.run_tests(...)` so helper discovery remains concise.

## Accomplishments

- Added optional `promptSnippet` / `promptGuidelines` fields to Python callable-tool metadata while omitting them for tools that do not provide prompt metadata.
- Implemented `_PtcHelpers.help(name)` with canonical-name and Python-alias lookup, JSON-safe cloning, parameter metadata, and bounded unknown-tool errors.
- Preserved existing `ptc.list_callable_tools()` and schema-only `ptc.get_tool_schema(...)` contracts.
- Updated README, generated `code_execution` guidance, CHANGELOG, and focused contract tests so `ptc.help(...)` is framed as targeted optional-tool metadata lookup.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1 + Task 2 | `9601383` | feat | Added RED/green runtime proof, prompt metadata propagation, and `ptc.help(...)` helper implementation. |
| Task 3 | `ca55153` | docs | Added README, generated prompt guidance, CHANGELOG, and contract-test alignment for on-demand `ptc.help(...)`. |
| Post-apply metadata | `578b3ef` | chore | Recorded Phase 52 APPLY postflight/lifecycle state. |
| Handoff | `6ce83bc` | wip | Paused with APPLY complete and PR #8 checks passing before UNIFY. |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/contracts/tool-types.ts` | Modified | Made prompt metadata typing explicit/available for callable metadata flow. |
| `src/tools/python-tool-contract.ts` | Modified | Added optional prompt metadata propagation into JSON-safe Python callable-tool metadata. |
| `src/tools/tool-wrapper.ts` | Modified | Updated Python `CallableToolMetadata` TypedDict for optional prompt fields. |
| `src/python-runtime/runtime.py` | Modified | Added `ptc.help(...)` helper and preserved existing schema/list helper behavior. |
| `src/index.ts` | Modified | Updated generated `code_execution` prompt guidance for targeted `ptc.help(...)` use. |
| `README.md` | Modified | Documented `ptc.help(tool_name)` with bounded on-demand usage guidance. |
| `CHANGELOG.md` | Modified | Recorded Phase 52 helper metadata/introspection addition. |
| `test/callable-tool-introspection-helper.test.ts` | Modified | Added live CodeExecutor proof for prompt metadata and help-helper behavior. |
| `test/callable-tool-introspection-contract.test.ts` | Modified | Locked README/helper-surface documentation alignment. |
| `test/prompt-guidance.test.ts` | Modified | Locked generated guidance language against unconditional introspection. |
| `test/index.test.ts` | Modified | Preserved generated tool-description/extension guidance contract. |
| `test/tool-wrapper.test.ts` | Modified | Kept wrapper/TyedDict output aligned with metadata surface. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep `ptc.get_tool_schema(...)` schema-only | Existing callers expect it to return the parameter schema, not a full metadata object. | Richer helper guidance lives in `ptc.help(...)` without breaking compatibility. |
| Include `parameters` in `ptc.help(...)` | A help object should answer both “what is this tool for?” and “how do I call it?” | Agents can avoid a second schema lookup when doing targeted optional-tool inspection. |
| Preserve prompt metadata as optional/non-empty only | Not every host/custom tool has prompt metadata, and empty fields add noise. | Existing tools remain compatible; metadata remains concise. |
| Keep generated guidance compact | Static prompt bloat would undermine Phase 47 guidance work. | Future helper docs should continue to prefer examples and targeted introspection over dumping inventories. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 1 | `test/tool-wrapper.test.ts` was updated to keep generated TypedDict coverage aligned with the new metadata keys. |
| Deferred | 0 | None |

**Total impact:** Plan executed as intended; the only extra touched test file was directly related to wrapper metadata contract coverage.

### Deferred Items

None from Phase 52. Existing hotspot/dependency advisories remain carried forward in project state.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `npm audit --json` exits non-zero for moderate advisories | Recorded as unchanged advisory baseline: 0 critical / 0 high / 3 moderate; no Phase 52 dependency changes. |
| Several touched files are known hotspots by line count | Kept changes focused, added companion tests, and carried the hotspot warning forward for Phase 53. |

## Next Phase Readiness

**Ready:**
- Phase 53 can plan the first-class test runner verb on top of the now richer callable-tool help/introspection surface.
- Full verification is green at 230 passing / 0 failing with clean TypeScript build.

**Concerns:**
- `runtime.py`, `src/index.ts`, `README.md`, and `test/index.test.ts` remain hotspots; Phase 53 should avoid broad growth where a focused helper/test file is practical.
- Moderate dependency advisories remain acknowledged but unchanged.

**Blockers:** None.

---
*Phase: 52-callable-tool-introspection, Plan: 01*
*Completed: 2026-05-12*
