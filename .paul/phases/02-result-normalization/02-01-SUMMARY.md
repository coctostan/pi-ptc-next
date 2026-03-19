---
phase: 02-result-normalization
plan: 01
subsystem: runtime
tags: ["ptcValue", "tool-adapters", "rpc-protocol", "hashline", "testing"]
requires:
  - phase: 01-active-tool-runtime-seam
    provides: ["active Pi executor preference for overridden builtins"]
provides:
  - "explicit `details.ptcValue` preference helper in normalization"
  - "mocked hashline-style structured payload regression coverage"
  - "RPC proof that structured nested tool results reach Python unchanged"
affects:
  - verification
  - interop-proof-and-docs
tech-stack:
  added: []
  patterns:
    - "Prefer `details.ptcValue` before any text-derived normalization"
    - "Use mocked anchored payloads to prove hashline-native machine contracts without a heavy harness"
key-files:
  created: []
  modified:
    - src/tool-adapters.ts
    - test/tool-adapters.test.ts
    - test/rpc-protocol.test.ts
key-decisions:
  - "Decision: Keep runtime changes limited to `src/tool-adapters.ts`; no `src/rpc-protocol.ts` code change was needed."
  - "Decision: Resolve post-apply test-file diagnostics within the same planned test files instead of adding new support config."
patterns-established:
  - "Hashline-native structured result tests should prove both unchanged `ptcValue` passthrough and text fallback behavior."
duration: ~34min
started: 2026-03-16T23:19:47Z
completed: 2026-03-16T23:53:27Z
---

# Phase 02 Plan 01: Result Normalization Summary

**`code_execution` now has explicit, regression-tested `details.ptcValue` preference behavior, plus mocked hashline-style proof that structured results survive the nested RPC boundary without breaking text fallback behavior.**

## Performance

| Metric | Value |
|--------|-------|
| Duration | ~34 minutes |
| Started | 2026-03-16T23:19:47Z |
| Completed | 2026-03-16T23:53:27Z |
| Tasks | 3 completed |
| Files modified | 3 |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: Structured machine values are preferred when present | Pass | `src/tool-adapters.ts` now uses `extractPtcValue()` before any text normalization, and tests confirm `read` / `grep` / `edit` structured payloads are returned unchanged. |
| AC-2: Existing text fallback behavior stays intact | Pass | Adapter tests still prove grep parsing, read text passthrough, edit summary+diff fallback, and generic custom-tool text fallback when `ptcValue` is absent. |
| AC-3: Structured values cross the RPC tool boundary unchanged | Pass | `test/rpc-protocol.test.ts` now asserts a nested `read` result with mocked hashline-style `details.ptcValue` is emitted back as the exact `tool_result.value`. |

## Accomplishments

- Made `details.ptcValue` preference explicit in `src/tool-adapters.ts` via a dedicated extraction helper.
- Added mocked hashline-style structured payload coverage for `read`, `grep`, and `edit` results.
- Added RPC-level regression proof that nested structured tool results pass through unchanged.
- Kept the full `pi-ptc-next` suite green while preserving all existing text fallback behavior.

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `src/tool-adapters.ts` | Modified | Made structured `ptcValue` preference explicit before fallback normalization branches. |
| `test/tool-adapters.test.ts` | Modified | Added hashline-style structured payload and fallback regression coverage. |
| `test/rpc-protocol.test.ts` | Modified | Added nested RPC passthrough proof and follow-up test-file diagnostics cleanup. |

## Verification Results

- `node --test test/tool-adapters.test.ts test/rpc-protocol.test.ts` ✅
- `npm test` ✅ (53/53 passing)
- LSP diagnostics for `test/tool-adapters.test.ts` and `test/rpc-protocol.test.ts` ✅

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Keep the runtime change inside `src/tool-adapters.ts` | The existing runtime already preferred `ptcValue`; the phase only needed to make that rule explicit and verifiable. | Avoided unnecessary churn in `src/rpc-protocol.ts` or Python runtime files. |
| Use mocked hashline-style payloads instead of a heavier integration harness | Phase 2 scope called for lightweight proof first. | Phase 4 can focus on the real two-extension smoke test without re-laying the basics. |
| Fix post-apply test diagnostics inside the same planned test files | The follow-up issue was local to the touched test files. | No extra support config or additional tracked files were needed. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 1 | Minor; no scope creep |
| Scope additions | 0 | None |
| Deferred | 1 | Still planned in later milestone phase |

**Total impact:** Essential cleanup only; the plan stayed narrow and all acceptance criteria still passed.

### Auto-fixed Issues

**1. Test diagnostics cleanup after APPLY**
- **Found during:** Post-APPLY verification follow-up
- **Issue:** The two modified test files triggered local diagnostics concerns and module-mode warnings during cleanup attempts.
- **Fix:** Resolved the issue inside the planned test files using `module.require(...)` and type-safe fake-process scaffolding, then removed an unnecessary temporary `tsconfig.test.json` artifact.
- **Files:** `test/tool-adapters.test.ts`, `test/rpc-protocol.test.ts`
- **Verification:** `node --test test/tool-adapters.test.ts test/rpc-protocol.test.ts`, `npm test`, and LSP diagnostics all passed cleanly.

### Deferred Items

- Lightweight two-extension smoke proof with `pi-hashline-readmap` remains deferred to Phase 4.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| A small refactor in `src/tool-adapters.ts` briefly left a missing brace during APPLY | Fixed immediately, then re-ran the targeted build/test verify before continuing. |
| Attempting to scope ESM behavior via `test/package.json` broke the broader CommonJS test suite during diagnostics cleanup | Reverted that experiment, kept CommonJS runtime behavior, and solved the problem within the touched test files instead. |

## Next Phase Readiness

**Ready:**
- Phase 3 can build on explicit `ptcValue` preference semantics instead of inferred behavior.
- The repo now has focused adapter and RPC evidence for structured hashline-style interop.
- Full test baseline is green before moving into broader verification/doc work.

**Concerns:**
- Documentation for structured result shapes is still missing.
- The real two-extension smoke test is still needed to close the end-to-end confidence gap.

**Blockers:**
- None for Phase 3 planning.

## Next Phase

Phase 2 is complete. Transition to Phase 3 — Verification and plan the next slice of structured-payload and fallback-proof work.

---
*Phase: 02-result-normalization, Plan: 01*
*Completed: 2026-03-16*
