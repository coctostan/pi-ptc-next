---
phase: 43-publish-metadata-and-documentation
plan: 01
completed: 2026-03-29T14:02:16Z
duration: "~1h (docs alignment + repeated verification + release-note creation)"
---

## Objective
Align the user-facing publish/install/docs surface with the already-renamed package baseline `pi-ptc-advanced@0.15.0`, including README install guidance, maintainer/release documentation, changelog framing, and explicit fork-lineage acknowledgment.

## What Was Built
| File | Purpose | Current Lines |
|------|---------|---------------|
| `README.md` | Reframed the active publish/install baseline around `pi-ptc-advanced@0.15.0`, clarified repository-vs-package naming, and linked the active `0.15.0` release note while preserving `0.8.0` as historical context | 855 |
| `CHANGELOG.md` | Added a `0.15.0` release-facing entry and repositioned `0.8.0` as historical baseline context | 48 |
| `docs/personal-fork-maintenance.md` | Updated maintainer workflow guidance to the `pi-ptc-advanced@0.15.0` baseline and linked the new active release note | 141 |
| `docs/releases/0.15.0.md` | Added a dedicated release note for the publishable-fork baseline, including naming lineage, verification flow, retained runtime behavior, and deferred publish-readiness items | 97 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | README and install guidance match the publish target and lineage | PASS | `README.md` now documents `pi-ptc-advanced@0.15.0` as the active publish baseline, keeps `pi install git:github.com/coctostan/pi-ptc-next` as the canonical install path, and explicitly distinguishes upstream origin, prior fork lineage, and current package target |
| AC-2 | Release-facing docs and changelog describe the 0.15.0 baseline | PASS | `CHANGELOG.md`, `docs/personal-fork-maintenance.md`, and new `docs/releases/0.15.0.md` all describe the active `0.15.0` baseline while retaining `0.8.0` only as historical context |
| AC-3 | Documentation stays honest about scope and release workflow boundaries | PASS | Updated docs explicitly preserve manual publish/git boundaries, avoid claiming new runtime/package behavior, and keep final publish-readiness work deferred to Phase 44 |

## Verification Results
| Command | Result |
|---------|--------|
| `grep -n 'pi-ptc-advanced\|0.15.0\|pi-ptc-next\|cegersdoerfer/pi-ptc' README.md | head -40` | PASS |
| `grep -Rni '0\.15\.0\|pi-ptc-advanced\|0\.8\.0' CHANGELOG.md docs/personal-fork-maintenance.md docs/releases/0.15.0.md | head -80` | PASS |
| `npm run verify:release-package` | PASS — package metadata and tarball surface still validate as `pi-ptc-advanced@0.15.0` |
| `npm test` | PASS (`207` passing / `0` failing) |
| `npm audit --json` | PASS for unchanged baseline tracking (`0 critical / 2 high / 3 moderate / 1 low`) |

## Module Execution Reports
### Carried-forward APPLY module evidence
- `[dispatch] pre-apply`:
  - TODD(50): test infrastructure present and suitable for verification (`node --test` via `npm test`)
  - WALT(100): baseline quality snapshot available at `207` passing / `0` failing
- `[dispatch] post-task`:
  - TODD(100): PASS — verification stayed green after the documentation tasks
- `[dispatch] post-apply advisory`:
  - IRIS(250): no actionable code-review concerns for this markdown-only documentation slice
  - DOCS(250): previously planned release-facing drift was resolved across the active baseline docs (`README.md`, `CHANGELOG.md`, `docs/personal-fork-maintenance.md`, `docs/releases/0.15.0.md`)
  - SKIP(300): no separate structured apply-time knowledge artifact was produced; key decisions are captured in this summary instead
  - RUBY(300): no post-apply debt hook was applicable beyond noting the slice stayed within documentation files
- `[dispatch] post-apply enforcement`:
  - WALT(100): PASS — build and full test suite stayed green with no regression
  - DEAN(150): PASS — `npm audit --json` remained at `0 critical / 2 high / 3 moderate / 1 low` with no new critical/high vulnerabilities introduced
  - TODD(200): PASS — full suite remained green after the docs/release-note updates

### Pre-UNIFY dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook`

### Post-UNIFY dispatch
- `[dispatch] post-unify: WALT(100) → 1 report / 1 side effect | SKIP(200) → 1 report / 0 side effects | RUBY(300) → 1 report / 0 side effects`
- WALT report:
  - Quality delta remained stable at `207` passing / `0` failing
  - Typecheck/build remained clean via `npm run build` and the build step inside `npm test`
  - Side effect: appended Phase 43 entry to `.paul/quality-history.md`
- SKIP report:
  - Captured the decision to distinguish repository lineage (`pi-ptc-next`) from package publish surface (`pi-ptc-advanced`) without inventing a new registry workflow
  - Captured that `0.8.0` remains archival release context while Phase 44 owns final publish-readiness validation
- RUBY report:
  - Complexity analysis was not applicable because the changed phase files were markdown documentation only
  - `wc -l` review showed large docs (`README.md` 855, `docs/personal-fork-maintenance.md` 141), but the slice remained bounded to planned release-facing documentation rather than product/runtime logic

## Deviations
1. **Dirty pre-existing working tree context remained in force:**
   - The repository still contained unrelated tracked/untracked changes before Phase 43 execution.
   - Resolution: APPLY proceeded with explicit user approval and kept edits bounded to the planned documentation files.
   - Impact: documentation work completed cleanly, but github-flow commit/PR automation remained an explicit manual follow-up rather than an automated phase action.
2. **Historical references were retained selectively instead of fully removed:**
   - `0.8.0` and `pi-ptc-next` still appear in some docs.
   - Resolution: retained only where they serve explicit archive or lineage context, not as the active release target.
   - Impact: the docs now distinguish active baseline vs historical baseline clearly while preserving useful release history.
3. **Tarball still includes a Python bytecode artifact:**
   - `npm pack --dry-run` still surfaces `src/python-runtime/__pycache__/runtime.cpython-314.pyc` in the package contents.
   - Resolution: noted again as non-blocking for this documentation-alignment slice rather than broadening scope into package cleanup.
   - Impact: remains a concrete follow-up item for Phase 44 publish-readiness verification.

## Key Patterns / Decisions
- Keep repository identity and package identity explicit: `pi-ptc-next` remains the repo/install lineage while `pi-ptc-advanced@0.15.0` is the active package baseline.
- Treat release-note history as additive, not destructive: `0.15.0` became the active documented baseline while `0.8.0` was preserved as historical context.
- Keep docs honest about workflow boundaries: verification commands are documented, but automated publish/tag/git workflow claims remain intentionally out of scope.
- Preserve publish-readiness as a separate final gate: documentation alignment closed Phase 43 without prematurely treating the release as fully ready.

## Deferred Issues
- `npm pack --dry-run` includes `src/python-runtime/__pycache__/runtime.cpython-314.pyc`; evaluate whether that artifact should be excluded before publish.
- Phase 44 still needs final package-content review, installability verification, and publish-readiness confirmation.
- GitHub-flow merge-gate/cleanup automation remains deferred while the branch still contains mixed historical changes outside this phase scope.

## Next Phase
- **Phase 43 is complete.**
- Next lifecycle action: create the Phase 44 plan for release verification and publish readiness.
- Phase 44 should verify final package contents, installability, and any tarball cleanup needed before release without reopening the already-complete documentation alignment slice.
