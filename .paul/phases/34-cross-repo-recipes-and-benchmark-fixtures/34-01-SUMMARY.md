---
phase: 34-cross-repo-recipes-and-benchmark-fixtures
plan: 01
completed: 2026-03-26T18:53:53Z
duration: ~35 minutes active APPLY/UNIFY work
---

## Objective
Turn the seeded Phase 33 `recipe_target` metadata into concrete internal recipe artifacts and a deterministic recipe-suite benchmark fixture without changing PTC runtime/helper semantics or Phase 35-owned user-facing docs.

## What Was Built
| File | Purpose | Lines |
|------|---------|-------|
| `.pi/evals/ptc/recipes/graph-compact-ranking.py` | Concrete graph-ranking recipe artifact using bounded PTC helper patterns | 65 |
| `.pi/evals/ptc/recipes/web-answer-comparison.py` | Concrete web-answer comparison recipe artifact with handle-aware bounded output | 62 |
| `.pi/evals/ptc/recipes/hashline-anomaly-summary.py` | Concrete hashline anomaly recipe artifact using bounded read/grep batching | 47 |
| `.pi/evals/ptc/recipes/codegraph-web-evidence-merge.py` | Concrete mixed codegraph+web evidence merge recipe artifact | 46 |
| `.pi/evals/ptc/baselines/local__seeded__recipes.json` | Deterministic recipe-only benchmark baseline fixture keyed to the seeded recipe cases | 182 |
| `test/eval-cases.test.ts` | Focused case-to-artifact and bounded-pattern proof for the recipe corpus | 150 |
| `test/benchmark-runner.test.ts` | Focused deterministic baseline/comparability proof for the recipe subset | 431 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Each seeded M4 workflow has a concrete bounded recipe artifact | PASS | Four `.py` recipe artifacts now exist under `.pi/evals/ptc/recipes/`, and `test/eval-cases.test.ts` asserts workflow-to-file alignment plus bounded helper usage |
| AC-2 | The recipe-suite benchmark fixture is deterministic and metadata-aligned | PASS | `.pi/evals/ptc/baselines/local__seeded__recipes.json` was generated from the seeded recipe subset and `test/benchmark-runner.test.ts` proves deterministic replay and empty-regression comparison |
| AC-3 | Focused proof locks artifact, case, and benchmark alignment without widening scope | PASS | `node --test test/eval-cases.test.ts test/benchmark-runner.test.ts` passed, and no runtime/helper/doc files were modified |

## Verification Results
| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `node --test test/eval-cases.test.ts` | PASS (8 tests) |
| `node --test test/benchmark-runner.test.ts` | PASS (9 tests) |
| `node --test test/eval-cases.test.ts test/benchmark-runner.test.ts` | PASS (17 tests) |
| `npm audit --json` | PASS WITH CONCERNS — unchanged baseline: `0 critical / 2 high / 2 moderate / 1 low` |
| `node --test` | PASS WITH CONCERNS — full-suite failure count remained unchanged at one unrelated `test/hashline-real-interop.mjs` failure while total passing coverage increased to `139` |

## Module Execution Reports
### Apply-phase carried-forward reports
- `IRIS` post-apply: no changed-file lint/review findings on the focused Phase 34 test surfaces.
- `DOCS` post-apply: no user-facing doc drift was introduced because the phase intentionally avoided `README.md` and `docs/**`.
- `WALT` post-apply: no quality regression versus the pre-apply baseline (`136 total / 135 passing / 1 failing` → `140 total / 139 passing / 1 failing`).
- `DEAN` post-apply: dependency audit baseline did not worsen.
- `TODD` post-apply: focused proof passed; one unrelated pre-existing full-suite failure remained outside this phase’s scope.

### Pre-unify dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook`

### Post-unify reports
- `WALT` recorded quality history in `.paul/quality-history.md` with Phase 34 marked as improving: same failing count, higher passing coverage, and clean typecheck.
- `SKIP` knowledge capture:
  - **Decision Record — Keep Phase 34 additive and artifact-first**
    - Type: decision
    - Phase: 34
    - Context: Phase 34 needed usable recipe examples before documentation/proof expansion, but runtime/helper/doc scope had to remain stable.
    - Decision: Ship repo-local recipe artifacts and a deterministic recipe-only baseline without reopening runtime semantics or Phase 35 docs work.
    - Alternatives considered: broaden runtime/helper APIs (rejected: unnecessary for artifact alignment); document recipes immediately (rejected: Phase 35 owns user-facing docs).
    - Rationale: This preserved milestone momentum while keeping proof narrow and bounded.
    - Impact: Phase 35 now has concrete recipe material to document and validate.
  - **Lesson Learned — Gitignored artifact layers need explicit reconciliation notes**
    - What happened: `.pi/` recipe artifacts were intentionally created under a gitignored tree.
    - Root cause: The repo treats eval artifacts as local/internal fixtures rather than default tracked source.
    - Lesson: UNIFY must explicitly distinguish repo-local artifact proof from git-tracked diffs so future plans do not misread missing staged files as missing implementation.
    - Action items: Preserve the `.pi/` reconciliation note in future recipe/documentation phases unless tracking policy changes.
- `RUBY` debt review: changed TypeScript files showed no ESLint complexity warnings, but `test/benchmark-runner.test.ts` remains a hotspot at `431` lines; keep future additions compact or extract the smallest local helper before growing the file further.

## Deviations
- Focused test edits landed earlier than their nominal task numbering so the recipe artifacts and benchmark baseline could be locked together coherently. This did not widen scope and remained fully inside the approved file set.
- `test/benchmark-runner.test.ts` needed one additional post-APPLY type-safety fix during UNIFY (`observation.output` is now narrowed before `JSON.parse`). This did not change product/runtime behavior; it only resolved a test-file diagnostic.
- Git-tracked reconciliation only surfaces `.paul/` and `test/` changes because `.pi/` is gitignored in this fork. The phase still produced the planned recipe artifacts and baseline, but their proof relies on direct file existence/content checks plus focused tests instead of staged diff visibility.

## Key Patterns / Decisions
- Use `ptc.fit_output(...)` as the final bounded return step in each recipe artifact so large intermediate tool results stay local to Python until the compact final payload.
- Keep recipe artifacts provider-agnostic and deterministic by leaning on seeded case metadata, ordered helper patterns, and static benchmark fixtures rather than live network/repo integration.
- Treat the deterministic recipe-suite baseline as a metadata-aligned fixture under the existing benchmark contract, not as a new benchmark runner mode.

## Next Phase
Phase 35 will use these concrete recipe artifacts and the deterministic baseline to add user-facing recipe documentation and focused ecosystem proof without turning `pi-ptc-next` into domain-specific logic.
