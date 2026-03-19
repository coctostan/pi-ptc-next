---
phase: 01-active-tool-runtime-seam
plan: 01
completed: 2026-03-16T20:55:38Z
duration: approximately 18 minutes
---

## Objective
Implement the Milestone 1 runtime seam so `code_execution` uses the same active Pi executors as chat for same-name overridden builtins (`read`, `grep`, `edit`), while preserving builtin fallback and current policy behavior.

## What Was Built
| File | Purpose | Notes |
|------|---------|-------|
| `src/tool-registry.ts` | Resolve callable tools against active Pi overrides before falling back to builtins | Active overridden builtin names now use the active executor when present and active |
| `src/contracts/tool-types.ts` | Add internal executor typing for the registry/runtime seam | Aligns internal execution shape with Pi runtime call order |
| `test/tool-registry.test.ts` | Add focused regression coverage for override/fallback behavior | Covers `read`, `grep`, `edit`, fallback behavior, and `code_execution` exclusion |
| `docs/hashline-integration/MILESTONE-01.md` | Document the runtime seam behavior | Notes active-override preference and builtin fallback |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Active override executor is used for same-name builtins | PASS | New `test/tool-registry.test.ts` assertions for active `read`/`grep`/`edit` overrides |
| AC-2 | Fallback and safety behavior stay intact | PASS | Fallback test passes; allow/block behavior remains in `getCallableTools()` |
| AC-3 | Runtime metadata remains usable and non-recursive | PASS | Tests assert callable metadata remains available and `code_execution` stays excluded |
| AC-4 | Narrow regression coverage proves the seam | PASS | `node --test test/tool-registry.test.ts test/code-executor.test.ts` passed with 10/10 tests |

## Verification Results
- `npm run build` ✅
- `node --test test/tool-registry.test.ts test/code-executor.test.ts` ✅

## Deviations
- Planned file `test/code-executor.test.ts` was not changed.
  - Reason: existing direct execution-path coverage was already sufficient for the seam; additional coverage was more appropriately added to `test/tool-registry.test.ts`.
  - Impact: no acceptance criteria were missed; scope stayed narrower than planned.

## Key Patterns / Decisions
- Prefer active Pi executors only when the same-name override is actually active.
- Preserve builtin fallback behavior when no active override is present.
- Keep the seam in the registry/runtime selection layer instead of broadening changes into Python runtime files.
- Add focused tests at the registry seam rather than over-expanding end-to-end coverage.

## Deferred Issues
- Structured `details.ptcValue` handling remains deferred to Milestone 2.
- Python ergonomics and metadata refinements remain deferred to later milestones.

## Next Phase
Phase 1 is complete. The current milestone is effectively complete based on the roadmap as written, so the next action is to reconcile milestone status and define the next milestone before planning further work.
