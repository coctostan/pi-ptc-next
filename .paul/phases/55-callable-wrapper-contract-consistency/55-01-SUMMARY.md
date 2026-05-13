---
phase: 55-callable-wrapper-contract-consistency
plan: 01
subsystem: runtime
tags: [ptc, code_execution, callable-tools, async-wrapper-contract, grep, milestone-19]

requires:
  - phase: 54-runner-availability-and-command-reporting
    provides: ptc.run_tests runner-availability guidance and deferred wrapper-semantics boundary
provides:
  - awaitable callable Pi wrapper guidance in generated code_execution descriptions and README
  - grep first-positional pattern shorthand in the Python runtime wrapper
  - focused wrapper-contract and live-audit regression coverage
affects:
  - phase-56-result-normalization-and-partial-error-semantics
  - code_execution prompt guidance
  - Python callable wrapper ergonomics

tech-stack:
  added: []
  patterns:
    - await direct callable Pi wrappers; keep ptc.* helper sync/async contracts separate

key-files:
  created:
    - .paul/phases/55-callable-wrapper-contract-consistency/55-01-SUMMARY.md
  modified:
    - src/python-runtime/runtime.py
    - src/index.ts
    - README.md
    - test/index.test.ts
    - test/live-audit-helpers.test.ts
    - test/python-tool-contract.test.ts

key-decisions:
  - "Decision: keep direct callable Pi wrappers async/awaitable and document that explicitly instead of adding synchronous shims."
  - "Decision: implement grep first-positional shorthand in the post-generated runtime wrapper because that is where grep path normalization already lives."
  - "Decision: leave path normalization, read_many partial results, batch_tool collect semantics, and ptc.run_tests behavior to their existing Phase 54/56 boundaries."

patterns-established:
  - "Pattern: generated code_execution guidance lists callable Pi wrappers as `await ...` while `ptc.*` helper lines retain their individual signatures."
  - "Pattern: obvious primary positional shorthand may be supported only when it maps cleanly to the existing keyword contract and duplicate positional/keyword values fail clearly."

duration: 10min
started: 2026-05-13T15:40:59Z
completed: 2026-05-13T15:50:51Z
---

# Phase 55 Plan 01: Callable Wrapper Contract Consistency Summary

**Callable Pi wrapper ergonomics are now test-backed and user-facing guidance clearly distinguishes awaitable direct wrappers from separately specified `ptc.*` helpers.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~10 minutes |
| Started | 2026-05-13T15:40:59Z |
| Completed | 2026-05-13T15:50:51Z |
| Tasks | 3 of 3 completed |
| Source commit | `2524fab` |
| PR | https://github.com/coctostan/pi-ptc-next/pull/12 |
| Files modified | 6 source/docs/test files plus lifecycle artifacts |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Callable wrappers have a consistent async contract | Pass | `src/index.ts`, README, and focused tests now show direct callable Pi wrappers as awaitable. Live audit uses `await read(...)`, `await grep(...)`, `await find(...)`, `await glob(...)`, and `await ls(...)`. |
| AC-2: First positional shorthand is consistent for obvious primary parameters | Pass | `src/python-runtime/runtime.py` now maps `await grep("pattern", path="...")` to the generated keyword wrapper, preserves keyword calls, and raises clear duplicate/too-many-positional TypeErrors. |
| AC-3: Generated guidance distinguishes callable wrappers from ptc helpers | Pass | Generated `code_execution` description says direct callable Pi wrappers are async and that `ptc.*` helpers follow listed sync/async signatures; README mirrors this split. |
| AC-4: Existing result-shape and runner behavior remain unchanged | Pass | No changes to `ptc.run_tests`, `ptc.read_many`, `ptc.batch_tool(..., on_error="collect")`, path normalization policy, or `details.ptcValue` passthrough semantics. Full `npm test` remained green. |

## Verification Evidence

| Command | Result | Evidence |
|---------|--------|----------|
| `PI_RTK_BYPASS=1 npm run build && PI_RTK_BYPASS=1 node --test test/python-tool-contract.test.ts test/live-audit-helpers.test.ts test/index.test.ts` after RED tests | RED expected failure | Focused test run failed before implementation because generated guidance lacked the new await contract text and grep positional shorthand was not accepted. |
| `PI_RTK_BYPASS=1 npm run build && PI_RTK_BYPASS=1 node --test test/python-tool-contract.test.ts test/live-audit-helpers.test.ts test/index.test.ts` after implementation | PASS | 42/42 focused tests passed, including live `await grep("line", path=".")` coverage. |
| `npm test` | PASS | 239/239 full suite passed. |
| `npm audit --json` | PASS_WITH_KNOWN_MODERATES | 0 critical / 0 high / 3 known moderate (`brace-expansion`, `file-type`, `yaml`), matching the current baseline. |
| GitHub PR checks | PASS | PR #12 reported Socket checks passing and both `Verify release baseline` checks passing before UNIFY reconciliation. |

## Module Execution Reports

### Pre-UNIFY
- `[dispatch] pre-unify: 0 modules registered for this hook`.

### TODD (test-driven development)
- **pre-apply:** PASS — approved plan was `type: tdd`, Task 1 created RED wrapper-contract and generated-guidance expectations before implementation.
- **post-task Task 1:** PASS — focused command failed before implementation, establishing RED evidence for missing await guidance / grep positional shorthand.
- **post-task Task 2:** PASS — focused command passed 42/42 after runtime and guidance implementation.
- **post-apply:** PASS — full `npm test` passed 239/239 with no unresolved regressions.

### WALT (quality gating)
- **pre-apply baseline:** `npm test` passed before implementation.
- **post-apply:** `npm test` passed 239/239; quality trajectory stable-to-improved because targeted wrapper behavior gained coverage without new failures.
- **post-unify side effect:** appended `.paul/QUALITY-HISTORY.md` row for Phase 55.

### DEAN (dependency audit)
- **pre-plan/pre-apply baseline:** 0 critical / 0 high / 3 known moderate.
- **post-apply:** 0 critical / 0 high / 3 known moderate (`brace-expansion`, `file-type`, `yaml`); no new critical/high vulnerabilities, so no block.

### SETH / OMAR / REED / PETE / VERA / ARCH / DOCS / RUBY
- **post-apply advisory:** no blocking findings. Runtime changes stayed within wrapper argument mapping and generated guidance; no auth, privacy, API, UI, data, CI, dependency-manifest, or external execution-policy expansion was introduced.
- **RUBY post-unify:** measured changed-file sizes included large existing files (`README.md` 957 lines, `src/index.ts` 539 lines, `src/python-runtime/runtime.py` 1364 lines, `test/index.test.ts` 1231 lines), but this phase made surgical edits and introduced no new broad refactor requirement. Existing large-file status remains a background concern, not a Phase 55 block.

### CODI / SKIP
- **CODI post-unify:** appended `.paul/CODI-HISTORY.md` row for `55-01` with injected blast-radius evidence from the PLAN (`buildGenericToolWrapper`, `buildReadWrapper`, `describePythonHelper`, `buildToolDescription`).
- **SKIP post-unify:** no separate knowledge entry required beyond this SUMMARY frontmatter and decisions; all durable source-backed decisions are captured here.

## Accomplishments

- Updated generated `code_execution` guidance to list direct callable Pi wrappers as awaitable while keeping `ptc.*` helper signatures separate.
- Added runtime support for `await grep("pattern", path="...")` with duplicate/too-many-positional guardrails.
- Updated README callable helper guidance without altering result-shape semantics or Phase 54 runner behavior.
- Added focused regression coverage in `test/index.test.ts`, `test/live-audit-helpers.test.ts`, and `test/python-tool-contract.test.ts`.
- Opened PR #12 and observed GitHub CI checks passing before UNIFY reconciliation.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Tasks 1-3 | `2524fab` | fix | Added RED/GREEN wrapper-contract coverage, implemented grep positional shorthand, updated generated guidance and README, and verified focused/full suites. |

Plan metadata: `1d2f47d` (UNIFY summary, history, issue-source, and Phase 56 transition artifacts).

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/python-runtime/runtime.py` | Modified | Added positional-argument normalization for the post-generated grep wrapper while preserving path normalization and async RPC execution. |
| `src/index.ts` | Modified | Generated tool description now says direct callable Pi wrappers are async/awaitable and prefixes callable helper lines with `await`. |
| `README.md` | Modified | Public helper list now states direct callable wrappers are awaitable and shows grep positional shorthand. |
| `test/index.test.ts` | Modified | Enforces generated guidance text for async callable wrappers vs `ptc.*` helper signatures. |
| `test/live-audit-helpers.test.ts` | Modified | Uses `await read(...)` and adds live-audit coverage for `await grep("line", path=".")`. |
| `test/python-tool-contract.test.ts` | Modified | Enforces wrapper async generation / description contract for grep. |
| `.paul/phases/55-callable-wrapper-contract-consistency/55-01-SUMMARY.md` | Created | This reconciliation artifact. |
| `.paul/STATE.md`, `.paul/ROADMAP.md`, `.paul/PROJECT.md` | Modified | Lifecycle transition and Phase 55 closure bookkeeping. |
| `.paul/QUALITY-HISTORY.md`, `.paul/CODI-HISTORY.md` | Modified | Post-unify durable module history rows. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep callable Pi wrappers awaitable | The generated wrappers execute RPC calls asynchronously and top-level await is already available in `code_execution`. | Avoids synchronous shims or event-loop complexity; users get explicit await guidance. |
| Fix grep shorthand in the runtime post-generated wrapper | The current grep override already normalizes active hashline grep paths after the generated wrapper, so it is the minimal place to normalize positional `pattern` too. | Plan deviated from the expected `src/tools/tool-wrapper.ts` implementation file but stayed inside repo source and reduced blast radius. |
| Preserve Phase 54 and Phase 56 boundaries | Runner availability and result/partial-error semantics are separate milestone slices. | Prevents helper-contract work from expanding into unrelated semantics. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Minimal implementation-location deviation; behavior stayed in approved scope. |
| Scope additions | 0 | No new features beyond callable wrapper contract consistency. |
| Deferred | 0 | Phase 56 result/partial-error items remain planned as before. |

**Total impact:** Small implementation-location deviation, no scope creep.

### Auto-fixed Issues

**1. Implementation location moved from wrapper generator to runtime grep adapter**
- **Found during:** Task 2 (Normalize wrapper generation and generated guidance)
- **Issue:** The live grep behavior was controlled by the post-generated `grep` wrapper in `src/python-runtime/runtime.py`, which wraps `_generated_grep` to normalize active hashline grep results.
- **Fix:** Added `*args, **kwargs` handling there so `grep("pattern", path="...")` maps to keyword `pattern`, duplicate values raise `TypeError`, and result normalization remains unchanged.
- **Files:** `src/python-runtime/runtime.py`
- **Verification:** Focused command passed 42/42; full `npm test` passed 239/239.
- **Commit:** `2524fab`

### Deferred Items

None newly deferred. Existing Phase 56 result normalization / partial-error semantics remain on the roadmap.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| README grep helper line initially broke the exact README grep example contract test because it no longer matched `grep(...) -> Union[...]`. | Revised README wording to preserve the expected exact contract phrase while still documenting positional shorthand. |
| Plan expected edits to `src/tools/tool-wrapper.ts` / `src/tools/python-tool-contract.ts`, but implementation did not require those files. | Recorded the mismatch as a plan deviation; behavior was fixed in the runtime grep adapter where the live override behavior actually resides. |

## Next Phase Readiness

**Ready:**
- Phase 55 callable wrapper contract consistency is implemented, tested, documented, and PR-backed.
- Direct callable wrapper await guidance is clearer for future live-proof and release-readiness checks.
- Phase 56 can focus on result normalization, path consistency, missing-file partial behavior, and batch_tool tool-level failure semantics without also carrying the async/positional-wrapper ambiguity.

**Concerns:**
- `src/python-runtime/runtime.py`, `src/index.ts`, README, and `test/index.test.ts` remain large hot files; future phases should continue surgical edits or split only when directly justified.
- `npm audit --json` still reports 3 known moderate advisories; no critical/high findings are present.

**Blockers:**
- None for Phase 56 planning.

---
*Phase: 55-callable-wrapper-contract-consistency, Plan: 01*
*Completed: 2026-05-13*
