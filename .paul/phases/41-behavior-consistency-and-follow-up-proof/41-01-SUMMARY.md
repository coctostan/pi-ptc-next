---
phase: 41-behavior-consistency-and-follow-up-proof
plan: 01
completed: 2026-03-27T19:22:00Z
duration: "~1h (implementation + focused + full-suite verification)"
---

## Objective
Close Milestone 15 behavior-consistency follow-ups by shipping bounded `batch_tool` partial-result collection, aligning empty-input behavior for `batch_tool([])`, tightening truncation framing to respect `maxOutputChars`, and refreshing proof/contracts across runtime guidance and tests.

## What Was Built
| File | Purpose | Current Lines |
|------|---------|---------------|
| `src/python-runtime/runtime.py` | Added `batch_tool` `on_error` mode normalization (`raise` / `collect`), empty-input alignment (`batch_tool([]) -> []`), and bounded `batch_partial` collect-mode envelope with ordered per-call result/error entries | 743 |
| `src/utils.ts` | Reworked `truncateOutput(...)` so final output respects configured output cap while retaining truncation notice when budget allows | 197 |
| `src/index.ts` | Updated generated code_execution helper guidance to reflect new `batch_tool(..., on_error=None)` signature and collect-mode behavior | 424 |
| `test/orchestration-helper.test.ts` | Added deterministic collect-mode contract coverage and updated empty-input expectations | 320 |
| `test/live-audit-stress.test.ts` | Replaced mixed-failure ambiguity audit with deterministic collect-mode proof and aligned empty-input behavior assertion | 352 |
| `test/live-audit-pipeline.test.ts` | Tightened output-boundary assertion to require exact `maxOutputChars` compliance | 201 |
| `test/utils.test.ts` | Updated truncation tests for exact-cap behavior and tiny-cap fallback behavior | 121 |
| `test/index.test.ts` | Updated code_execution description assertions for new batch helper signature and collect-mode note | 1220 |
| `test/orchestration-ecosystem-contract.test.ts` | Updated runtime/README contract regexes for new `batch_tool` shape | 28 |
| `README.md` | Updated Python helper contract list for `batch_tool(..., on_error=None)` plus collect-mode semantics note | 853 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | `batch_tool` supports bounded partial-result collection without breaking default behavior | PASS | `batch_tool` keeps default fail-fast behavior and now supports `on_error='collect'` returning ordered `batch_partial` entries with `stats.total/succeeded/failed`; covered in `test/orchestration-helper.test.ts` and `test/live-audit-stress.test.ts` |
| AC-2 | Empty-input and truncation-framing behavior is consistent and predictable | PASS | `batch_tool([])` now returns `[]` (stress/orchestration proof), while `truncateOutput` now enforces `<= maxOutputChars` and keeps truncation notice when budget allows (`test/utils.test.ts`, `test/live-audit-pipeline.test.ts`) |
| AC-3 | Follow-up proof and helper contracts are aligned | PASS | Runtime helper signature/guidance updates and README contract updates are validated by `test/index.test.ts`, `test/orchestration-ecosystem-contract.test.ts`, plus full suite |

## Verification Results
| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `node --test test/orchestration-helper.test.ts` | PASS (5/5) |
| `node --test test/live-audit-stress.test.ts` | PASS (15/15) |
| `node --test test/live-audit-pipeline.test.ts test/utils.test.ts test/index.test.ts` | PASS |
| `node --test test/orchestration-ecosystem-contract.test.ts` | PASS (1/1) |
| `npm test` | PASS (`207` passing / `0` failing) |

## Module Execution Reports
### Carried-forward APPLY module evidence
- `[dispatch] pre-apply`:
  - TODD(50): test infrastructure present (`node --test` via `npm test`) and suitable for task-level verification
  - WALT(100): baseline quality snapshot available from prior phase (`205` passing / `0` failing)
- `[dispatch] post-task`: focused verification commands passed for each task slice (`build`, focused orchestration/stress/pipeline/contract tests)
- `[dispatch] post-apply advisory`:
  - IRIS(250): no actionable complexity/unused-var smell surfaced in changed TypeScript test/guidance files
  - DOCS(250): README helper contract updated in-phase, reducing drift for behavior changes
  - RUBY(300): advisory note retained that `runtime.py` and `test/index.test.ts` remain large hotspot files (bounded edits only)
  - SKIP(300): phase-level decision capture deferred to summary reconciliation output below
- `[dispatch] post-apply enforcement`:
  - WALT(100): PASS — full suite remains green with improved baseline (`207/0`)
  - DEAN(150): PASS — `npm audit --json` shows `0 critical / 2 high / 3 moderate / 1 low` (no critical block)
  - TODD(200): PASS — full test suite executes successfully

### Pre-UNIFY dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook`

### Post-UNIFY dispatch
- `[dispatch] post-unify: WALT(100) → 1 report / 1 side effect | SKIP(200) → 1 report / 0 side effects | RUBY(300) → 1 report / 0 side effects`
- WALT report:
  - Quality delta improved from prior baseline (`205` to `207` passing, `0` failing)
  - Side effect: appended Phase 41 entry to `.paul/quality-history.md`
- SKIP report:
  - Captured key decision context from this summary (collect-mode policy, empty-input alignment, truncation cap enforcement)
- RUBY report:
  - `npx eslint --no-config-lookup --rule 'complexity: [warn, 10]' --rule 'no-unused-vars: warn' --format json ...` on changed TS files: no issues
  - `wc -l` debt signal: `src/python-runtime/runtime.py` at 743 lines (significant hotspot), `test/index.test.ts` at 1220 lines (existing hotspot)

## Deviations
1. **Dirty pre-existing working tree context remained in force:**
   - This repo already contained out-of-scope tracked/untracked changes before Phase 41 execution.
   - Resolution: implementation and verification stayed bounded to planned Phase 41 behavior-consistency files.
   - Impact: no functional scope creep in this phase, but merge-gate/git hygiene automation remains a follow-up concern.
2. **Runtime hotspot growth accepted intentionally:**
   - `runtime.py` grew from prior hotspot levels while implementing bounded collect-mode behavior.
   - Resolution: kept change narrowly focused; deferred structural split/refactor remains tracked debt.

## Key Patterns / Decisions
- Preserve deterministic default behavior: `batch_tool` still raises on first failure unless `on_error='collect'` is explicitly chosen.
- Make partial mode explicit and machine-readable via `kind: "batch_partial"`, ordered entries, and bounded summary stats.
- Align list-style helper ergonomics where practical: `batch_tool([])` now returns `[]` similar to `read_many([])`.
- Treat truncation caps as hard boundaries at executor output level; notices are best-effort within the same budget.

## Deferred Issues
- `src/python-runtime/runtime.py` remains a major debt hotspot (743 lines); future helper work should strongly prefer extraction over continued growth.
- Existing large anchors remain in `README.md` and `test/index.test.ts`; future docs/proof slices should continue using focused companion files where possible.
- GitHub-flow merge-gate/cleanup automation remains deferred while the working tree still includes mixed historical changes outside this phase scope.

## Next Phase
- **Phase 41 is complete.** Milestone 15 is now ready to close as complete.
- Suggested next lifecycle action: run `/paul:milestone` to complete Milestone 15 and choose/start the next milestone.
