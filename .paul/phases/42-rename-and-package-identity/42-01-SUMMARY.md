---
phase: 42-rename-and-package-identity
plan: 01
completed: 2026-03-27T20:50:00Z
duration: "~1h (metadata/script updates + focused + full-suite verification)"
---

## Objective
Rename the publish-facing package baseline to `pi-ptc-advanced` at `0.15.0`, align root lock metadata with that identity, and update release-package verification so the renamed package surface is proven without opening the broader documentation/history phase.

## What Was Built
| File | Purpose | Current Lines |
|------|---------|---------------|
| `package.json` | Renamed published package identity to `pi-ptc-advanced` and bumped version baseline to `0.15.0` while preserving existing repo/homepage/bugs metadata | 73 |
| `package-lock.json` | Aligned root lock metadata (`name` and `version`) with the new package baseline for consistent `npm pack` / install behavior | 4075 |
| `scripts/verify-release-package.sh` | Added explicit package-name assertion and updated version assertion to prove the `pi-ptc-advanced@0.15.0` release surface | 51 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Package identity baseline is renamed and versioned | PASS | `package.json` and root `package-lock.json` now expose `pi-ptc-advanced` at `0.15.0`; verified with `grep -n '"name"\|"version"' package.json package-lock.json | head -20` |
| AC-2 | Release-package verification matches the new publish target | PASS | `bash scripts/verify-release-package.sh` now asserts both package name and version, and `npm pack --dry-run` reports `pi-ptc-advanced-0.15.0.tgz` |
| AC-3 | Package-identity work stays scoped to Phase 42 | PASS | README/docs still contain older naming/version references; drift was captured explicitly via `grep -Rni 'pi-ptc-next\|@cegersdo/pi-ptc\|0.8.0' README.md docs | head -40` and deferred to Phase 43 |

## Verification Results
| Command | Result |
|---------|--------|
| `grep -n '"name"\|"version"' package.json package-lock.json | head -20` | PASS |
| `bash scripts/verify-release-package.sh` | PASS |
| `npm run build` | PASS |
| `npm test` | PASS (`207` passing / `0` failing) |
| `grep -Rni 'pi-ptc-next\|@cegersdo/pi-ptc\|0.8.0' README.md docs 2>/dev/null | head -40` | PASS — remaining drift captured for Phase 43 |

## Module Execution Reports
### Carried-forward APPLY module evidence
- `[dispatch] pre-apply`:
  - TODD(50): test infrastructure present and suitable for verification (`node --test` via `npm test`)
  - WALT(100): baseline quality snapshot available at `207` passing / `0` failing
- `[dispatch] post-apply advisory`:
  - IRIS(250): skipped in practice for this metadata/script-only slice; no changed TypeScript/JavaScript source files required code-smell review
  - DOCS(250): flagged intentional drift because `README.md`, `docs/releases/0.8.0.md`, and `docs/personal-fork-maintenance.md` still reference the old package/version baseline
  - SKIP(300): no structured decision-table rows existed in `STATE.md`, so no durable apply-time decision extraction artifact was produced
  - RUBY(300): no post-apply hook installed
- `[dispatch] post-apply enforcement`:
  - WALT(100): PASS — build and full test suite stayed green with no regression
  - DEAN(150): PASS — `npm audit --json` remained at `0 critical / 2 high / 3 moderate / 1 low` with no new critical/high vulnerabilities introduced
  - TODD(200): PASS — full suite remained green after package-surface edits

### Pre-UNIFY dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook`

### Post-UNIFY dispatch
- `[dispatch] post-unify: WALT(100) → 1 report / 1 side effect | SKIP(200) → 1 report / 0 side effects | RUBY(300) → 1 report / 0 side effects`
- WALT report:
  - Quality delta remained stable at `207` passing / `0` failing
  - Typecheck/build remained clean via `npm run build`
  - Side effect: appended Phase 42 entry to `.paul/quality-history.md`
- SKIP report:
  - Captured the phase decision to separate package identity changes from README/history/publish documentation work, leaving drift visible and intentionally deferred to Phase 43
  - Captured the publish-readiness note that `npm pack --dry-run` currently includes `src/python-runtime/__pycache__/runtime.cpython-314.pyc`
- RUBY report:
  - Complexity analysis was not applicable because the changed phase files were package metadata, a lockfile, and a shell script rather than TypeScript implementation files
  - `wc -l` review showed no actionable debt in `package.json` (73) or `scripts/verify-release-package.sh` (51); `package-lock.json` is large (4075) but expected as generated lock metadata rather than hand-maintained product logic

## Deviations
1. **Dirty pre-existing working tree context remained in force:**
   - The repository still contained unrelated tracked/untracked changes before Phase 42 execution.
   - Resolution: edits stayed bounded to `package.json`, `package-lock.json`, and `scripts/verify-release-package.sh`.
   - Impact: package-identity work completed cleanly, but git/PR automation remains an explicit manual follow-up.
2. **Tarball includes a Python bytecode artifact:**
   - `npm pack --dry-run` still surfaces `src/python-runtime/__pycache__/runtime.cpython-314.pyc` in the package contents.
   - Resolution: noted as non-blocking for this rename/package-identity slice instead of broadening scope mid-phase.
   - Impact: should be reviewed in Phase 44 publish-readiness verification.
3. **Documentation drift intentionally preserved:**
   - README and release-facing docs still advertise the prior package lineage/version baseline.
   - Resolution: drift captured explicitly and left for Phase 43 instead of blending docs work into the metadata phase.
   - Impact: publish metadata is now correct in the package surface, while user-facing documentation still needs the planned follow-up phase.

## Key Patterns / Decisions
- Keep Phase 42 package-surface only: metadata, lockfile identity, and release-package verification were updated without touching broader docs/history narrative.
- Validate publish identity directly in the release-package script: checking both package name and version is more trustworthy than version-only verification.
- Preserve repository/homepage/bugs links for now: package rename did not force a repository move, so URLs were intentionally left unchanged until broader publish/docs review.
- Treat documentation drift as explicit follow-up context rather than hidden debt: surfaced through verification output and carried forward to Phase 43.

## Deferred Issues
- README/install/history/release docs still need rename/lineage updates for `pi-ptc-advanced`; this is the core scope of Phase 43.
- `npm pack --dry-run` includes `src/python-runtime/__pycache__/runtime.cpython-314.pyc`; evaluate whether that artifact should be excluded before publish.
- GitHub-flow merge-gate/cleanup automation remains deferred while the branch still contains mixed historical changes outside this phase scope.

## Next Phase
- **Phase 42 is complete.**
- Next lifecycle action: create the Phase 43 plan for publish metadata and documentation updates.
- Phase 43 should update README/install guidance, release-facing docs, and fork-lineage acknowledgment without reopening runtime/package behavior.