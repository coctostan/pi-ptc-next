---
phase: 39-p0-file-discovery-repair
plan: 01
subsystem: runtime
tags: [ptc, runtime.py, glob, max_files, file-discovery, regression-tests]
requires:
  - phase: 38-composition-patterns-and-audit-scorecard
    provides: [FINAL-AUDIT remediation priority list]
provides:
  - helper-side file-discovery no longer depends on `glob(limit=...)`
  - passing bounded regression proof for `ptc.read_tree`, `ptc.find_files`, `ptc.find_files_abs`
affects:
  - 40-error-handling-hardening
  - 41-behavior-consistency-and-follow-up-proof
tech-stack:
  added: []
  patterns:
    - "Normalize tool-return payload shape at helper boundary before applying bounds"
    - "Keep audit harness execution cwd pinned to fixture workspace for deterministic file reads"
key-files:
  created: []
  modified:
    - src/python-runtime/runtime.py
    - test/live-audit-helpers.test.ts
key-decisions:
  - "Decision: bound file-discovery results in helper code instead of depending on `glob(limit=...)`"
  - "Decision: keep APPLY verification harness-local by storing executor workspace and reusing it in `exec(...)`"
patterns-established:
  - "When a callable wrapper payload shape is ambiguous (string vs list), normalize before downstream helper chaining"
  - "Phase-39 scope remains P0 fix + direct regression proof only"
duration: ~35min
started: 2026-03-27T17:20:00Z
completed: 2026-03-27T17:55:43Z
---

# Phase 39 Plan 01 Summary

**Resolved the P0 file-discovery breakage by removing `glob(limit=...)` dependency in runtime helpers and shipping passing bounded live-audit regression proof for all three affected helper paths.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~35min |
| Started | 2026-03-27T17:20:00Z |
| Completed | 2026-03-27T17:55:43Z |
| Tasks | 2 completed |
| Files modified | 2 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: File-discovery helpers no longer depend on `glob(limit=...)` | Pass | `src/python-runtime/runtime.py` now calls `glob(pattern=..., path=...)`, normalizes payload shape, and enforces `max_files` helper-side. |
| AC-2: Live audit proof covers repaired behavior | Pass | `test/live-audit-helpers.test.ts` now asserts bounded success for `read_tree/find_files/find_files_abs` instead of known-bug rejection. |
| AC-3: Fix stays narrowly scoped | Pass | Only planned runtime+audit files changed for implementation; later-phase concerns (syntax errors, batch partial mode, empty-input consistency, truncation overhead) were not implemented. |

## Module Execution Reports

### Carried forward from APPLY
- **WALT (post-apply enforcement):** quality gate passed after implementation verification.
- **DEAN (post-apply enforcement):** no new critical/high vulnerability delta during apply verification.
- **TODD (post-apply + post-task enforcement):** focused and full test checks passed for this loop.
- **DOCS (post-apply advisory):** drift warning noted because `src/` changed without README/CHANGELOG updates in this phase slice.

### Pre-UNIFY dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook`

### Post-UNIFY dispatch
- **WALT (post-unify):** appended quality trend entry to `.paul/quality-history.md` for Phase 39 (`203 passing / 0 failing`, trend `↑ improving`).
- **RUBY (post-unify):** targeted complexity check on `test/live-audit-helpers.test.ts` reported no issues; line-count check flagged existing hotspot pressure (`src/python-runtime/runtime.py` at 677 lines).
- **SKIP (post-unify):** no structured decision-table extraction output generated; current STATE decisions are tracked as bullet entries and remain preserved there.

## Accomplishments

- Removed helper reliance on unsupported `glob(limit=...)` and restored bounded file-discovery behavior.
- Added payload-shape normalization in `find_files()` so string/list return forms from callable tools are handled safely before slicing.
- Converted three previously failing audit cases into passing bounded regression proof and kept full-suite verification green.

## Task Commits

Execution completed without per-task git commits in APPLY. Changes remain in working tree for user-directed commit flow.

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1: Repair helper-side file discovery | pending (not committed in APPLY) | feat | Runtime helper fix in `src/python-runtime/runtime.py` |
| Task 2: Replace known-bug audit assertions | pending (not committed in APPLY) | test | Regression proof updates in `test/live-audit-helpers.test.ts` |

Plan metadata: pending commit (UNIFY artifacts staged in working tree)

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/python-runtime/runtime.py` | Modified (+22/-1) | Remove `glob(limit=...)` dependency; normalize glob payload shape; enforce helper-side `max_files` bounds |
| `test/live-audit-helpers.test.ts` | Modified (+20/-23) | Convert known-bug failures to passing bounded assertions; align harness execution cwd with fixture workspace |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Normalize and bound in helper layer instead of relying on `glob(limit=...)` | Live callable glob wrapper does not guarantee `limit` kwarg support | Restores `ptc.find_files`, `ptc.find_files_abs`, `ptc.read_tree` without changing public helper signatures |
| Keep `exec(...)` bound to per-test workspace | `read_tree` regression proof failed when nested reads resolved against repo root rather than fixture cwd | Makes live-audit helper tests deterministic and accurate for bounded file-tree behavior |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Essential harness alignment, no scope expansion |
| Scope additions | 0 | None |
| Deferred | 1 | Docs drift warning retained for future doc-focused phase |

**Total impact:** Essential fix-ups only; phase remained within P0 runtime+regression scope.

### Auto-fixed Issues

**1. Test harness context alignment for `read_tree` proof**
- **Found during:** Task 2 verification
- **Issue:** nested `read()` calls resolved against repo cwd, causing fixture-path failures
- **Fix:** store workspace on executor and execute Python with workspace cwd in the harness helper
- **Files:** `test/live-audit-helpers.test.ts`
- **Verification:** `node --test test/live-audit-helpers.test.ts` (21/21 pass)
- **Commit:** pending (working tree)

### Deferred Items

- Documentation drift warning (`README.md`/`CHANGELOG.md` unchanged while `src/` changed) intentionally deferred to doc-oriented follow-up unless Phase 40 requires immediate contract doc updates.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| `ptc.read_tree()` initially failed verification with fixture path errors after runtime fix | Updated harness execution context to use per-test workspace cwd; reran focused and full verification successfully |

## Verification Results

- `npm run build` → **pass**
- `node --test test/live-audit-helpers.test.ts` → **pass** (21 pass / 0 fail)
- `npm test` → **pass** (203 pass / 0 fail)
- `npx eslint --no-config-lookup --rule 'complexity: [warn, 10]' --rule 'no-unused-vars: warn' --format json test/live-audit-helpers.test.ts` → **pass (no issues)**

## Next Phase Readiness

**Ready:**
- P0 file-discovery path is unblocked and covered by focused live regression proof.
- Phase 40 can now concentrate on syntax error reporting hardening without reopening this bug.

**Concerns:**
- `src/python-runtime/runtime.py` remains a large hotspot (677 lines); future changes should remain surgical.

**Blockers:**
- None

---
*Phase: 39-p0-file-discovery-repair, Plan: 01*
*Completed: 2026-03-27*
