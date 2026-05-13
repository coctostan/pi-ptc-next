---
phase: 54-runner-availability-and-command-reporting
plan: 01
subsystem: testing
tags: [ptc, code_execution, node-test, runner-availability, command-reporting, milestone-19]

provides:
  - ptc.run_tests(pattern) scalar runner_path and runner_resolution metadata
  - shell-quoted command display for safe patterns containing spaces
  - clearer runner-unavailable warning for active-runtime Node/PATH dependency
  - README and generated code_execution guidance for runtime-dependent Node availability

affects:
  - src/python-runtime/runtime.py
  - src/index.ts
  - README.md
  - test/run-tests-helper.test.ts
  - test/index.test.ts

key-decisions:
  - "Decision: keep execution as argv + shell=False while rendering command metadata with shlex.join for unambiguous display."
  - "Decision: resolve node with shutil.which against the child runtime PATH and report runner_path/runner_resolution as scalar metrics."
  - "Decision: keep missing node as structured ptc_report data with runner_available=false, not a Python execution error."
  - "Decision: do not broaden ptc.run_tests beyond Node node --test or alter Docker/package-script behavior in this phase."
---

# Phase 54 Plan 01: Runner Availability and Command Reporting Summary

**Implemented Phase 54 runtime/reporting hardening for `ptc.run_tests(pattern)`: runner availability now includes scalar resolution metadata, command display is shell-quoted for patterns with spaces, and user-facing guidance names the active-runtime Node dependency.**

## Performance

| Metric | Value |
|--------|-------|
| Tasks | 3 of 3 completed with one verification concern |
| Files modified | 6 (`src/python-runtime/runtime.py`, `src/index.ts`, `README.md`, `test/run-tests-helper.test.ts`, `test/index.test.ts`, this SUMMARY) |
| Scope additions | 0 |
| Deferred items | 1 unrelated pre-existing full-suite failure tracked below |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Runner availability is actionable | Pass | Missing-runner test now asserts `runner_available=false`, `runner_path=null`, `runner_resolution="missing_on_path"`, and a warning that Node must be available on the active runtime PATH. Available-runner path asserts scalar `runner_path` and `runner_resolution="path"`. |
| AC-2: Command metadata is unambiguous | Pass | New focused test uses `passing case.test.js` and asserts `metrics.command === "node --test 'passing case.test.js'"`; runtime uses `shlex.join(command)` while still executing `subprocess.run(command, shell=False, ...)`. |
| AC-3: Existing safe runner behavior is preserved | Pass with concern | Focused helper suite still covers passing, failing, invalid-pattern, runner-unavailable, and space-containing pattern behavior. Full `npm test` has the same unrelated `test/hashline-edit-contract.test.ts` README edit-example failure observed in the pre-apply baseline. |
| AC-4: User-facing guidance matches live runtime behavior | Pass | `src/index.ts`, `README.md`, and `test/index.test.ts` now state that `ptc.run_tests` requires Node in the active runtime and may return `runner_available=false` as structured data in Python-only/Docker runtimes. |

## Verification Evidence

| Command | Result | Evidence |
|---------|--------|----------|
| `PI_RTK_BYPASS=1 npm run build && PI_RTK_BYPASS=1 node --test test/run-tests-helper.test.ts test/index.test.ts` after Task 1 | RED expected failure | New assertions failed before implementation, proving missing runner metadata, quoted command display, and generated guidance expectations were not yet satisfied. |
| `PI_RTK_BYPASS=1 npm run build && PI_RTK_BYPASS=1 node --test test/run-tests-helper.test.ts test/index.test.ts` after Task 2 | PASS | 16/16 focused tests passed, including available/missing runner metadata and quoted command display. |
| `npm test` pre-apply baseline | PASS_WITH_BASELINE_FAILURE | 235 pass / 1 fail; failure was `test/hashline-edit-contract.test.ts` README edit example expecting `diffData` in the normalized edit payload. |
| `npm test` post-apply | PASS_WITH_SAME_BASELINE_FAILURE | 236 pass / 1 fail; same `test/hashline-edit-contract.test.ts` README edit example failure, no new Phase 54 failures. |
| `npm audit --json` | PASS_WITH_KNOWN_MODERATES | 0 critical / 0 high / 3 moderate (`brace-expansion`, `file-type`, `yaml`), matching the known moderate-only baseline; no new critical/high vulnerabilities. |
| GitHub Flow postflight | PASS_WITH_PENDING_CI | Branch pushed to `origin/feature/54-runner-availability-command-reporting`; PR #11 opened at https://github.com/coctostan/pi-ptc-next/pull/11; `Verify release baseline` pending at creation time. |

## Module Execution Reports

### TODD (test-driven development)
- **pre-apply:** PASS — approved plan is `type: tdd` and Task 1 is explicitly RED/test-first before implementation.
- **post-task Task 1:** PASS — RED evidence captured by the focused command failing on new expectations before runtime/docs implementation.
- **post-task Task 2:** PASS — focused helper/description suite passed 16/16 after implementation.
- **post-apply:** PASS_WITH_CONCERNS — Phase 54 focused tests passed; full suite retained the same unrelated baseline failure.

### WALT (quality gating)
- **pre-apply baseline:** `npm test` produced 235 pass / 1 fail, existing `test/hashline-edit-contract.test.ts` README edit-example mismatch.
- **post-apply:** `npm test` produced 236 pass / 1 fail, same failing test; no new quality regression from Phase 54 files.

### DEAN (dependency audit)
- **post-apply:** `npm audit --json` reported 0 critical / 0 high / 3 moderate. Moderate-only advisories are unchanged from plan baseline and do not block this phase.

### DOCS / IRIS / ARCH / SETH / DAVE / GABE / DANA / OMAR / REED / PETE / VERA / ARIA / LUKE / SKIP
- **post-apply advisory:** no blocking findings from the changed set. README and generated guidance were updated with test-enforced runtime-availability wording; no CI, API, data, UI, dependency-manifest, auth, privacy, or observability surface was changed.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/python-runtime/runtime.py` | Modified | Added `shutil.which` runner resolution, scalar `runner_path`/`runner_resolution`, active-runtime missing-node warning, and `shlex.join(command)` display while preserving argv execution and `shell=False`. |
| `test/run-tests-helper.test.ts` | Modified | Added RED/GREEN assertions for runner resolution metadata, missing-runtime warning, and quoted command display for a pattern containing spaces. |
| `src/index.ts` | Modified | Updated generated `code_execution` helper guidance to describe runtime-dependent Node availability, structured runner-unavailable data, and command metadata. |
| `test/index.test.ts` | Modified | Enforced generated guidance text for active-runtime Node dependency and `runner_available=false` structured report data. |
| `README.md` | Modified | Documented runtime-dependent Node availability, runner metadata, and the non-substitute relationship to repo verification commands. |
| `.paul/phases/54-runner-availability-and-command-reporting/54-01-SUMMARY.md` | Created | Captures Phase 54 plan-vs-actual, verification, module notes, and the unrelated full-suite baseline failure. |

## Task Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `5f5d861` | Added RED expectations for runner reporting and guidance. |
| Task 2 | `d336087` | Implemented runner metadata, quoted command display, and docs/generated guidance updates. |
| Task 3 | `0a9bc5e` | Summary, state, and postflight lifecycle updates. |

## Deviations and Follow-up

| Item | Status | Owner |
|------|--------|-------|
| Full `npm test` does not fully pass because of `test/hashline-edit-contract.test.ts` README edit-example `diffData` mismatch. | PASS_WITH_CONCERNS; same failure existed in the pre-apply baseline and is unrelated to Phase 54 runner availability work. | Future dedicated hashline/edit contract phase or hotfix, not Phase 54. |
| Cross-runner/package-script support, Docker image changes, and phase-55/56 helper semantics. | Deferred by plan boundary. | Later Milestone 19 phases. |

## Next Phase Readiness

Phase 54 implementation is ready for UNIFY with a verification concern: focused Phase 54 checks pass and audit has no new critical/high findings, while full suite retains the same unrelated baseline failure seen before APPLY.
