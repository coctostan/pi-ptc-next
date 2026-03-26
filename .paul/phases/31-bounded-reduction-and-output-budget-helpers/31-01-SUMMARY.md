---
phase: 31-bounded-reduction-and-output-budget-helpers
plan: 01
subsystem: python-runtime
completed: 2026-03-26T16:02:26Z
duration: ~11min
tags: [ptc, python-runtime, reduction, output-budget, code_execution]
provides:
  - bounded Python reduction via `ptc.reduce_tool(...)`
  - bounded JSON-safe output fitting via `ptc.fit_output(...)`
  - runtime bootstrap access to the session output cap for helper-aligned compaction
---

# Phase 31 Plan 01: Bounded Reduction and Output-Budget Helpers Summary

**Phase 31 is complete:** `pi-ptc-next` now lets Python-side `code_execution` scripts both reduce nested tool results into a compact accumulator and fit large JSON-safe values into bounded previews aligned with the session output cap. This extends the Phase 30 orchestration helpers without widening scope into broader orchestration APIs or user-facing docs.

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~11 minutes |
| Started | 2026-03-26T15:51:18Z |
| Completed | 2026-03-26T16:02:26Z |
| Tasks | 3 completed |
| Files modified | 3 product/proof files + PALS artifacts |

## What Was Built

| File | Purpose | Lines |
|------|---------|-------|
| `src/code-executor.ts` | Injects `PTC_MAX_OUTPUT_CHARS` into the Python runtime bootstrap so output-fitting helpers can default to the same session cap enforced by the executor. | 94 |
| `src/python-runtime/runtime.py` | Adds bounded output-budget normalization, JSON-safe preview compaction helpers, `ptc.reduce_tool(...)`, and `ptc.fit_output(...)` on top of the Phase 30 orchestration primitives. | 656 |
| `test/reduction-helper.test.ts` | Proves ordered reduction, session-budget/default override behavior, truncation metadata, and invalid-input failures through real `CodeExecutor` execution. | 268 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Python can reduce bounded nested tool-call results into a compact accumulator | Pass | `ptc.reduce_tool(...)` reuses the Phase 30 call-spec validation and batching path, preserves deterministic input order, respects bounded concurrency, and applies a user-supplied reducer to return only the accumulator. |
| AC-2: Python can compact JSON-safe values to a bounded output budget aligned with the session cap | Pass | `ptc.fit_output(...)` defaults to the session `maxOutputChars` budget, clamps explicit limits safely, preserves JSON-safe preview structure where possible, and falls back to tighter text/minimal representations when needed to stay inside the effective budget. |
| AC-3: Phase 31 stays narrowly scoped to reducer/output-budget helpers plus focused proof | Pass | The work stayed inside `src/code-executor.ts`, `src/python-runtime/runtime.py`, and a dedicated focused test file. README/tool-description updates and broader orchestration APIs remain deferred to Phase 32. |

## Verification Results

| Command | Result |
|---------|--------|
| `python3 -m py_compile src/python-runtime/runtime.py` | Pass |
| `npm run build` | Pass |
| `node --test test/reduction-helper.test.ts` | Pass (`4` passing / `0` failing) |
| `npm test` | Pass (`127` passing / `0` failing) |
| `npm audit --json` | Baseline unchanged at `0 critical / 2 high / 2 moderate / 1 low` |

## Module Execution Reports

### Apply-phase carried evidence
- **WALT:** Pre-apply baseline was `123` passing / `0` failing`; post-apply verification finished green at `127` passing / `0` failing with `npm run build` still clean.
- **TODD:** The phase kept execution proof in a focused file (`test/reduction-helper.test.ts`) rather than broadening existing omnibus suites.
- **DEAN:** Dependency audit baseline remained unchanged and non-blocking at `0 critical / 2 high / 2 moderate / 1 low`.
- **DOCS:** Expected doc drift remains for touched `src/` files because `README.md` and `CHANGELOG.md` were intentionally deferred to the proof/docs slice in Phase 32.
- **IRIS:** No no-config ESLint findings or hardcoded-secret matches were reported for the touched TypeScript files.

### Pre-unify
- No modules are registered for `pre-unify` in the installed registry.

### Post-unify side effects
- **WALT:** Phase 31 was recorded in `.paul/quality-history.md` as improved from the Phase 30 baseline to `127` passing / `0` failing via `npm test`, with build/typecheck still clean via `npm run build`.
- **RUBY:** No ESLint complexity warnings were reported for the touched TypeScript files, but `src/python-runtime/runtime.py` grew to `656` lines and is now a clear runtime-file debt hotspot that future helper work should avoid growing further without extraction.
- **SKIP:** Captured durable knowledge from this phase:

## [2026-03-26] Keep `ptc.fit_output(...)` aligned with the executor session output cap by default

**Type:** decision  
**Phase:** 31 — Bounded Reduction and Output-Budget Helpers  
**Related:** `src/code-executor.ts`, `src/python-runtime/runtime.py`, `test/reduction-helper.test.ts`

**Context:** Phase 31 needed a Python-side output-budget helper, but `CodeExecutor` already enforces the real session output cap when returning the final result. A helper default that ignored that cap would produce misleading previews and encourage oversized outputs.

**Decision:** Inject `PTC_MAX_OUTPUT_CHARS` into the Python runtime bootstrap and make `ptc.fit_output(...)` default to that session limit, while still allowing smaller explicit helper budgets.

**Alternatives considered:**
- Let `ptc.fit_output(...)` choose its own unrelated default budget — rejected because it could drift from the real executor cap and make helper behavior less trustworthy.
- Move final truncation responsibility entirely into Python — rejected because executor-level output enforcement is already the correct hard safety boundary and should remain authoritative.

**Rationale:** Aligning helper defaults with the existing executor cap preserves a single source of truth for output sizing while still making Python-side pre-compaction practical.

**Impact:** Future output-budget helpers should treat executor limits as authoritative and compose with them rather than inventing conflicting defaults.

## [2026-03-26] Prefer structured preview metadata over opaque string compaction in `ptc.fit_output(...)`

**Type:** trade-off  
**Phase:** 31 — Bounded Reduction and Output-Budget Helpers  
**Related:** `src/python-runtime/runtime.py`, `test/reduction-helper.test.ts`

**What we gained:** Callers get bounded previews that still preserve useful JSON-safe shape and truncation metadata (`limits`, `stats`, and `truncated`) instead of losing all structure immediately.

**What we accepted:** The helper implementation is more complex than a simple string truncation wrapper, and the already-large runtime file absorbed additional local helper code in this phase.

**Conditions for revisiting:** Revisit this trade-off if runtime-file debt becomes more harmful than the structured-preview ergonomics, or if Phase 32/docs feedback shows that the metadata shape should be simplified further.

## [2026-03-26] Treat runtime-file debt as the main concern after adding reduction/output-budget helpers

**Type:** lesson  
**Phase:** 31 — Bounded Reduction and Output-Budget Helpers  
**Related:** `src/python-runtime/runtime.py`, `.paul/phases/31-bounded-reduction-and-output-budget-helpers/31-01-PLAN.md`

**What happened:** The Phase 31 helper slice stayed within planned files and passed verification cleanly, but `src/python-runtime/runtime.py` grew from an already-large helper host to `656` lines.

**What we learned:** Even when scope stays disciplined, adding more runtime-local helpers to the same file now carries visible maintainability cost. Future phases should prefer proof/docs work or carefully justified extraction rather than continuing to accumulate helper logic in the same file by default.

**How to apply:** Treat further `runtime.py` growth as a conscious trade-off, document it explicitly, and prefer extraction only when the adjacent phase value outweighs the churn.

## Accomplishments
- Added runtime bootstrap plumbing so Python-side helper defaults can see the live session `maxOutputChars` value.
- Added bounded normalization for positive integer helper budgets and JSON-safe output fitting.
- Added `ptc.reduce_tool(...)` for deterministic reduction over nested tool-call results.
- Added `ptc.fit_output(...)` for bounded JSON-safe previews with truncation metadata and safe fallback compaction.
- Added focused `CodeExecutor` proof for both helpers, including invalid-input behavior.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/code-executor.ts` | Modified | Exposes the executor output budget to the Python runtime. |
| `src/python-runtime/runtime.py` | Modified | Adds bounded reduction and output-fitting helpers plus supporting normalization/compaction logic. |
| `test/reduction-helper.test.ts` | Created | Provides focused live execution proof for the Phase 31 helper surface. |
| `.paul/phases/31-bounded-reduction-and-output-budget-helpers/31-01-SUMMARY.md` | Created | Records plan-vs-actual reconciliation for Phase 31. |
| `.paul/STATE.md` | Modified | Closes the Phase 31 loop and routes the project to Phase 32 planning. |
| `.paul/PROJECT.md` | Modified | Records the shipped Phase 31 helper capability and follow-on Phase 32 planning focus. |
| `.paul/ROADMAP.md` | Modified | Marks Phase 31 complete and advances Milestone 12 progress. |
| `.paul/quality-history.md` | Modified | Appends the quality snapshot for Phase 31. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Default `ptc.fit_output(...)` to the executor session output cap | Python-side compaction should align with the real hard output boundary instead of inventing a conflicting budget. | Future output-budget helpers should compose with executor limits rather than bypassing them. |
| Return structured preview metadata from `ptc.fit_output(...)` | Structured previews are more useful to callers than an immediate opaque string collapse. | Consumers can reason about truncation and omitted structure without inspecting raw oversized values. |
| Keep proof in a dedicated focused execution test | The phase only needed narrow runtime evidence and should not widen existing omnibus test surfaces. | Future helper slices should keep following the focused-proof pattern when possible. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | None |
| Scope additions | 0 | None |
| Deferred | 0 | None |

**Total impact:** None. The phase goals and boundaries held.

### Auto-fixed Issues

| Issue | Resolution | Impact |
|-------|------------|--------|
| One new `ptc.fit_output(...)` override-budget assertion initially expected a richer result shape than the tightest compaction path could preserve under the requested limit. | Relaxed the test to use a still-small explicit budget that remained bounded while matching the intentionally safe minimal-compaction behavior. | None — stayed inside the dedicated proof file and preserved the helper contract. |

### Deferred Items
None — docs/tool-description updates and broader orchestration examples remain intentionally reserved for Phase 32.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| The new output-fitting helper needed a fallback path when structured preview payloads themselves exceeded the allowed character budget. | Added a final text/minimal compaction step so the helper remains safely bounded even when preview metadata is expensive relative to the requested limit. |
| `src/python-runtime/runtime.py` is now substantially above the soft size threshold. | Accepted the growth for this phase because the helper logic remained runtime-local and verification was clean, but recorded it as the main debt concern for future work. |
| The Node test runner still emits package-level `MODULE_TYPELESS_PACKAGE_JSON` warnings for ESM-style `.ts` tests. | Left unchanged because that packaging decision remains outside the scoped Phase 31 runtime-helper work. |

## Next Phase Readiness

**Ready:**
- Phase 31 is closed with shipped `ptc.reduce_tool(...)` and `ptc.fit_output(...)` helpers plus focused execution proof.
- The Python runtime now supports both bounded orchestration and bounded result compaction for large intermediate workflows.
- Full verification is green at `127` passing / `0` failing with the dependency audit baseline unchanged.

**Concerns:**
- `src/python-runtime/runtime.py` is now `656` lines and should not keep absorbing helper logic casually.
- README/tool-description guidance does not yet describe the Phase 31 helpers; that drift is intentionally deferred to Phase 32.
- The dependency audit baseline remains non-zero at `0 critical / 2 high / 2 moderate / 1 low`.

**Blockers:**
- None

---
*Phase: 31-bounded-reduction-and-output-budget-helpers, Plan: 01*  
*Completed: 2026-03-26*
