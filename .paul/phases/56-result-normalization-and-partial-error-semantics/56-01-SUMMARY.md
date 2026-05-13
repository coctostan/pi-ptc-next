---
phase: 56-result-normalization-and-partial-error-semantics
plan: 01
subsystem: runtime
tags: [ptc, code_execution, read_many, batch_tool, path-normalization, partial-error-semantics, milestone-19]

requires:
  - phase: 55-callable-wrapper-contract-consistency
    provides: awaitable callable wrapper contract and grep positional shorthand that this phase builds on without reopening
provides:
  - workspace-relative path normalization for read(), ptc.read_text(), ptc.read_many(), and ptc.batch_tool read/grep payloads
  - additive `on_error` kwarg on ptc.read_many with typed `read_many_partial` envelope and `[read_many error] ...` marker in the default list[str] form
  - tool-level failure classification for ptc.batch_tool(..., on_error="collect")
  - documented path-normalization invariant in generated code_execution description and README
affects:
  - phase-57-live-proof-and-release-readiness
  - code_execution prompt guidance
  - Python helper consumers relying on batched read/grep aggregation

tech-stack:
  added: []
  patterns:
    - "Single path-normalization policy applied uniformly across direct read/grep, ptc.read_* helpers, and ptc.batch_tool read/grep payloads."
    - "Additive on_error keyword on ptc.read_many mirrors ptc.batch_tool's collect-mode envelope shape (kind=*_partial, results, stats)."
    - "Normalized tool-error payload detection ({ok:false, error:...} / kind='execution_error') in batch_tool collect mode without reclassifying transport-level successes elsewhere."

key-files:
  created:
    - .paul/phases/56-result-normalization-and-partial-error-semantics/56-01-PLAN.md
    - .paul/phases/56-result-normalization-and-partial-error-semantics/56-01-SUMMARY.md
    - test/runtime-path-and-partial.test.ts
  modified:
    - src/python-runtime/runtime.py
    - src/index.ts
    - README.md
    - test/orchestration-helper.test.ts
    - .gitignore

key-decisions:
  - "Decision: normalize the read pipeline by post-wrapping the generated `read` function in runtime.py (mirroring the existing grep wrapper) rather than threading normalization into _rpc_call."
  - "Decision: add `on_error` to ptc.read_many as an additive keyword-only kwarg and keep the default list[str] contract; missing entries become a bounded `[read_many error] ...` marker instead of leaking a traceback."
  - "Decision: classify ptc.batch_tool tool-level errors only in collect mode and only for normalized payloads ({ok:false, error:...} or kind='execution_error'); raise mode and arbitrary structured returns are untouched."
  - "Decision: add `runs/` to .gitignore after noticing workguard scratch artifacts were staged; not part of the planned scope but a small repo-hygiene cleanup."

patterns-established:
  - "Pattern: when a tool-level RPC succeeds but returns a normalized error payload, ptc.batch_tool(on_error='collect') surfaces it as ok:false with a string `error` summary and preserves the raw payload under `value`."
  - "Pattern: structured partial-result envelopes use `kind: '<helper>_partial'` plus `results` and `stats {total, succeeded, failed}` shape; ptc.read_many now joins ptc.batch_tool under this convention."

duration: 50min
started: 2026-05-13T16:15:00Z
completed: 2026-05-13T17:05:00Z
---

# Phase 56 Plan 01: Result Normalization and Partial-Error Semantics Summary

**Direct `read()`, `ptc.read_text()`, `ptc.read_many()`, and `ptc.batch_tool` `read`/`grep` payloads now share one workspace-relative path policy; `ptc.read_many` exposes an opt-in typed partial envelope; and `ptc.batch_tool(..., on_error="collect")` classifies tool-level normalized error payloads as failed entries while preserving the raw payload.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~50 minutes |
| Started | 2026-05-13T16:15:00Z |
| Completed | 2026-05-13T17:05:00Z |
| Tasks | 3 of 3 completed |
| Source commit | `dd18576` |
| PR | https://github.com/coctostan/pi-ptc-next/pull/13 |
| Files modified | 5 source/docs/test files plus lifecycle artifacts |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Direct read + helper read paths normalize consistently | Pass | `test/runtime-path-and-partial.test.ts` proves `read(path="file-a.txt")` returns workspace-relative `path: "file-a.txt"` in ReadResult and `read(path="OUTSIDE.txt")` preserves the absolute `/var/external/out.txt`. The new `_normalize_read_result` helper applies the same `_relativize_path` policy used by `_normalize_grep_result`. |
| AC-2: `ptc.batch_tool` propagates the same path-normalization policy | Pass | `_normalize_batch_value` in `batch_tool` applies `_normalize_read_result` to `read` entries and `_normalize_grep_result` to `grep` entries in both `raise` and `collect` modes. Existing batch_tool order/concurrency/collect tests still pass (245/245). |
| AC-3: `ptc.read_many` exposes a typed partial envelope | Pass | `ptc.read_many(["file-a.txt","MISSING.txt"], on_error="collect")` returns `{kind:"read_many_partial", mode:"collect", results:[{index,path,ok,value\|error}...], stats:{total:2,succeeded:1,failed:1}}`. Default form returns `list[str]` with `"[read_many error] ..."` for the missing entry. |
| AC-4: `ptc.batch_tool(..., on_error="collect")` classifies tool-level failures as failed | Pass | A new `soft_fail` stub in `test/orchestration-helper.test.ts` returns `{ok:false, error:"nope"}` via successful RPC. The batch result shows `stats.succeeded:1, stats.failed:1`, the soft_fail entry has `ok:false`, `error` is a summary string matching `/nope/`, and raw payload is preserved under `value`. |
| AC-5: Generated guidance and README describe the new contracts | Pass | `src/index.ts` and `README.md` now document the `on_error` kwarg, the `read_many_partial` envelope, tool-level failure classification in batch_tool collect mode, and the path-normalization invariant. |

## Verification Evidence

| Command | Result | Evidence |
|---------|--------|----------|
| `node --test test/runtime-path-and-partial.test.ts test/orchestration-helper.test.ts` after RED tests | RED expected failure | 4/11 failed with AC-1/AC-3/AC-4 messages: missing `on_error` kwarg, raw traceback in default form, soft_fail counted as succeeded, ReadResult path not normalized. |
| `node --test test/runtime-path-and-partial.test.ts test/orchestration-helper.test.ts` after implementation | PASS | 11/11 focused tests passed. |
| `npm test` | PASS | 245/245 full suite passed. |
| `npm run build` | PASS | TypeScript clean after fixing two backtick escapes inside the generated description template literal. |
| `python3 -m py_compile src/python-runtime/runtime.py` | PASS | Runtime module imports cleanly. |
| `npm audit --json` | PASS_WITH_KNOWN_MODERATES | 0 critical / 0 high / 3 known moderate (`brace-expansion`, `file-type`, `yaml`); strictly better than `.paul/dean-baseline.json` (4/0/3). |
| GitHub PR checks | PASS | PR #13: `Verify release baseline` ×2 SUCCESS, Socket Security checks SUCCESS, `mergeStateStatus: CLEAN`, `mergeable: MERGEABLE`. |

## Module Execution Reports

### Pre-UNIFY
- `[dispatch] pre-unify: 0 modules registered for this hook`.

### TODD (test-driven development)
- **pre-apply:** PASS — plan was `type: tdd`, Task 1 added RED tests for AC-1/AC-3/AC-4 before implementation.
- **post-task Task 1:** PASS — focused test run produced exactly 4 expected failures with messages tied to the new ACs while 7 prior orchestration tests stayed green.
- **post-task Task 2:** PASS — focused test run flipped all 4 RED tests to green; AC-2 covered indirectly by the unchanged batch_tool order/concurrency suite.
- **post-task Task 3:** PASS — generated description and README updated; existing `test/prompt-guidance.test.ts` etc. unchanged.
- **post-apply:** PASS — `npm test` 245/245.

### WALT (quality gating)
- **pre-apply baseline:** `npm test` 245/245 (carried from Phase 55 final state plus this branch's RED additions before GREEN).
- **post-apply:** `npm test` 245/245; build clean; `python3 -m py_compile` clean.
- **post-unify side effect:** appended `.paul/QUALITY-HISTORY.md` row for Phase 56 (durable history write).

### DEAN (dependency audit)
- **pre-plan/pre-apply baseline:** 0 critical / 0 high / 3 moderate (strictly better than the recorded `.paul/dean-baseline.json` 4/0/3 baseline from Phase 48).
- **post-apply:** 0 critical / 0 high / 3 moderate; no new critical/high vulnerabilities, no override needed; existing baseline remains valid through 2026-06-11.

### IRIS (review & inspection)
- **pre-plan flag carried forward:** `runtime.py` is a known debt hotspot; keep changes surgical.
- **post-apply:** `runtime.py` grew from 1364 → 1504 lines (+140). This is over the plan's stated 40–80 line budget, mostly because the runtime override for `read` and the `_safe_read_for_many` helper added more glue than expected. No structural refactor was performed; all additions sit adjacent to existing helpers and stay within the runtime adapter. Flagged here for Phase 57 / future-milestone consideration but not treated as a Phase 56 blocker.

### CODI (blast radius)
- **post-unify:** appended `.paul/CODI-HISTORY.md` row for `56-01` with injected blast-radius evidence from the PLAN (`_normalize_read_result`, `read_many`, `batch_tool`, `_classify_tool_error_payload`). No cross-module ripple was introduced; the runtime adapter, generated description, and README were the only changed surfaces beyond test files.

### DOCS (documentation drift)
- **post-apply:** README and the generated `code_execution` description both document the new `on_error` kwarg, `read_many_partial` envelope, batch_tool tool-level failure classification, and the path-normalization invariant. Two markdown-backtick escapes inside the JS template literal in `src/index.ts` were fixed during the build pass.

### RUBY (refactor opportunities)
- **post-apply:** `runtime.py` size flagged (see IRIS). No new broad refactor requirement introduced; surgical edits only.

### SETH / OMAR / REED / PETE / VERA / ARCH / GABE / LUKE / ARIA / DANA
- **post-apply advisory:** no findings. Changes stayed inside an internal Python runtime adapter, a generated tool description, and README docs; no auth, observability, resilience, performance, privacy, architecture, API gateway, UI/UX, accessibility, or data-migration surfaces were touched.

### SKIP (knowledge persistence)
- **post-unify:** no separate knowledge entry required beyond this SUMMARY frontmatter and decisions; all durable source-backed decisions are captured here.

### CARL (session boundary)
- **post-unify:** Phase 56 closed within a single session; no checkpoint pressure observed.

## Accomplishments

- Added `_normalize_read_result` and a `read` post-wrapper in `src/python-runtime/runtime.py` so direct `read()`, `ptc.read_text()`, `ptc.read_many()`, and `ptc.batch_tool` `read`/`grep` payloads share one workspace-relative path policy. Out-of-workspace absolute paths are preserved unchanged.
- Added an additive `on_error` keyword-only argument to `ptc.read_many`: default keeps `list[str]` semantics but missing/unreadable entries become a bounded `"[read_many error] ..."` marker; `on_error="collect"` returns a typed `read_many_partial` envelope with `{index, path, ok, value | error}` per entry and `{total, succeeded, failed}` stats.
- Added `_classify_tool_error_payload` and wired it into `ptc.batch_tool(..., on_error="collect")` so successful RPC calls returning `{ok:false, error:...}` or `kind:"execution_error"` are classified as failed entries while preserving the original payload under `value`.
- Refreshed the generated `code_execution` description (`src/index.ts`) and `README.md` to document the new envelopes and the path-normalization invariant.
- Added `test/runtime-path-and-partial.test.ts` with 6 focused cases proving AC-1/AC-3, and extended `test/orchestration-helper.test.ts` with the AC-4 tool-level failure classification test.
- Opened PR #13 with all 4 CI checks (`Verify release baseline` ×2, Socket Security ×2) green and `mergeStateStatus: CLEAN`.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Tasks 1–3 | `dd18576` | feat | Added RED tests, implemented path-normalization parity, `read_many` `on_error` envelope, and `batch_tool` tool-level failure classification, refreshed generated guidance and README, ignored `runs/` workguard scratch. |

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/python-runtime/runtime.py` | Modified | Added `_normalize_read_result`, `_classify_tool_error_payload`, `_safe_read_for_many`; extended `ptc.read_many` with `on_error`; wired path normalization and tool-error classification into `ptc.batch_tool`; post-wrapped `read` to apply path normalization. |
| `src/index.ts` | Modified | Generated `code_execution` description documents the new `on_error` kwarg, `read_many_partial` envelope, batch_tool tool-level failure classification, and path-normalization invariant. |
| `README.md` | Modified | Public helper list documents the same. |
| `test/orchestration-helper.test.ts` | Modified | Added AC-4 case: `soft_fail` stub returns `{ok:false, error:"nope"}` via successful RPC and is classified as failed by `batch_tool(on_error="collect")`. |
| `test/runtime-path-and-partial.test.ts` | Created | New focused suite covering AC-1 (read path normalization, out-of-workspace preservation, read_text smoke) and AC-3 (default marker + collect envelope). |
| `.gitignore` | Modified | Added `runs/` to ignore workguard scratch artifacts. |
| `.paul/phases/56-result-normalization-and-partial-error-semantics/56-01-PLAN.md` | Created | Approved plan for this phase. |
| `.paul/phases/56-result-normalization-and-partial-error-semantics/56-01-SUMMARY.md` | Created | This reconciliation artifact. |
| `.paul/STATE.md`, `.paul/ROADMAP.md` | Modified | Lifecycle transition bookkeeping. |
| `.paul/HANDOFF-2026-05-13-phase55-ready-to-plan.md` | Deleted | Already archived under `.paul/handoffs/archive/`; tracked deletion cleans the working tree. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Post-wrap the generated `read` in runtime.py rather than threading normalization through `_rpc_call` | The existing grep wrapper already normalizes generated wrapper output in place; mirroring that keeps the policy local and avoids broader RPC contract changes. | Single, contained code path; no cross-cutting RPC contract change. |
| Add `on_error` to `ptc.read_many` as an additive kwarg with a default that preserves `list[str]` | Backwards compatibility is critical — many existing callers rely on the `list[str]` shape and order. | No call-site churn; opt-in envelope for callers that need provenance. |
| Use a marker string `"[read_many error] ..."` for the default missing-entry slot | Keeps `list[str]` typing intact while replacing the surprising raw stack-flavored payload reported by live audit. | Callers can detect missing entries without parsing tracebacks; `on_error="collect"` remains the structured path. |
| Detect tool-level errors only in `batch_tool` collect mode | `raise` mode callers expect raw payloads and rely on explicit transport-exception semantics; only `collect` is the failure-classification API. | Avoids surprising existing `on_error="raise"` callers. |
| Add `runs/` to `.gitignore` after staging-cleanup | Workguard scratch artifacts had been staged by a prior phase's git add; they are local audit output and should never enter the repo. | Small repo-hygiene fix; outside the planned `files_modified` list and noted as a deviation. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | New test file rather than embedding ~100 LOC into `test/live-audit-helpers.test.ts` — explicit escape hatch in the plan. |
| Scope additions | 1 | Added `runs/` to `.gitignore` (minor repo-hygiene cleanup outside `files_modified`). |
| Budget overruns | 1 | `runtime.py` grew +140 lines vs the plan's 40–80 budget; surgical-only, no extraction, no new modules. |
| Deferred | 0 | Phase 57 / future-milestone items (live-audit issues 1, 4, 5, 8, 9) remain on roadmap as planned. |

**Total impact:** Small, contained — no scope creep into deferred boundaries; no contract-breaking changes; one budget overrun documented for IRIS review.

### Auto-fixed Issues

**1. Created `test/runtime-path-and-partial.test.ts` instead of extending `test/live-audit-helpers.test.ts`**
- **Found during:** Task 1 (RED) test design
- **Issue:** The PLAN's Task 1 noted: "(or a small new bounded `test/read-many-partial.test.ts` ONLY if mixing into existing file would force >50 LOC growth)". Adding 3 new tests plus the per-test stub setup (read tool that supports the OUTSIDE/MISSING semantics) would have grown `test/live-audit-helpers.test.ts` by ~100 LOC of new helper plumbing.
- **Fix:** Created `test/runtime-path-and-partial.test.ts` (236 lines) with a dedicated path-aware executor stub and 6 focused tests covering AC-1 and AC-3.
- **Files:** `test/runtime-path-and-partial.test.ts`
- **Verification:** 6/6 new tests pass; 245/245 full suite passes.
- **Commit:** `dd18576`

### Scope Additions

**1. `.gitignore` updated to ignore `runs/`**
- **Found during:** APPLY postflight `git status`
- **Issue:** Workguard scratch artifacts under `runs/` had been staged by an earlier phase's `git add -A`; they are local audit output and were about to be committed.
- **Fix:** Reset the over-broad commit, removed `runs/` from the index, added `runs/` to `.gitignore`, and re-committed only the planned changes.
- **Files:** `.gitignore`
- **Verification:** `git status` clean post-cleanup; PR #13 diff shows only planned + lifecycle files.
- **Commit:** `dd18576`

### Budget Overruns

**1. `runtime.py` grew +140 lines vs the planned 40–80 line budget**
- **Found during:** post-apply IRIS check
- **Issue:** The read-pipeline override (`_generated_read` + async `read` wrapper) plus the `_safe_read_for_many` helper plus the `_classify_tool_error_payload` helper plus the new `read_many` collect path added more glue than the plan budgeted.
- **Mitigation:** All additions sit adjacent to existing helpers (`_normalize_grep_result`, `_summarize_orchestration_error`, `_normalize_batch_on_error`) inside the same runtime adapter; no new module was created and no structural refactor was performed. The runtime adapter's existing debt status is unchanged — it stays a Phase 57 / future-milestone consideration, not a Phase 56 blocker.
- **Files:** `src/python-runtime/runtime.py`
- **Verification:** `python3 -m py_compile` clean; `npm test` 245/245 green.
- **Commit:** `dd18576`

### Deferred Items

None newly deferred. Live-audit issues 1 (`ptc.run_tests` runner availability), 4 (`ptc.list_helpers()` vs callable tool surface), 5 (positional-argument consistency across wrappers), 8 (`details.ptcValue` prominence), and 9 (`ptc.run_tests` command argv rendering) remain on the roadmap for Phase 57 / future-milestone work.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Two markdown-backtick characters inside the JS template literal in `src/index.ts` broke `tsc` | Replaced ``` `path` ``` and ``` `{ok: false, ...}` ``` markdown spans with plain text inside the generated description; documentation meaning preserved without backtick escaping. |
| Workguard scratch under `runs/` was staged during APPLY | Reset the broader commit, removed `runs/` from the index, added it to `.gitignore`, and re-committed only planned changes. |

## Next Phase

**Phase 57: Live Proof and Release Readiness.** With Phase 56 closing the result-normalization and partial-error semantics work, Milestone 19 has one remaining phase covering live proof of the helper hardening and release-readiness work for `0.18.0`. Suggested next action after merge: `/paul:plan` for Phase 57.
