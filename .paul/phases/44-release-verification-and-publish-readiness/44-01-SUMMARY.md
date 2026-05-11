---
phase: 44-release-verification-and-publish-readiness
plan: 01
completed: 2026-03-29T15:05:00Z
duration: "~1h (package-surface cleanup + release verification hardening + final proof)"
---

## Objective
Close the final release gate for `pi-ptc-advanced@0.15.0` by verifying the shipped tarball contents, proving installability from the packed artifact, and removing the known packaged Python bytecode artifact without reopening completed runtime or broad documentation work.

## What Was Built
| File | Purpose | Current Lines |
|------|---------|---------------|
| `package.json` | Narrowed the published Python runtime surface to the intended source assets (`runtime.py`, `rpc.py`) so cache/bytecode artifacts no longer ship in the tarball | 74 |
| `scripts/verify-release-package.sh` | Strengthened release verification to assert forbidden tarball entries and prove clean installability from a real packed tarball in a temporary directory | 93 |
| `docs/personal-fork-maintenance.md` | Updated maintainer guidance so the release verification gate explicitly includes tarball cleanliness and installability proof while keeping publish actions manual | 141 |
| `docs/releases/0.15.0.md` | Updated the active release note to reflect that the bounded release-readiness gate is now complete for the current manual publish model | 96 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Packaged contents exclude unintended bytecode while retaining required runtime assets | PASS | `npm pack --dry-run` now shows `src/python-runtime/runtime.py` and `src/python-runtime/rpc.py` without any `__pycache__` or `.pyc` entries |
| AC-2 | Release verification proves metadata, tarball shape, and installability from the packed artifact | PASS | `scripts/verify-release-package.sh` now validates metadata, required/forbidden tarball entries, creates a real `.tgz`, installs it into a temporary directory, and checks the installed surface |
| AC-3 | Final publish-readiness guidance stays accurate and bounded | PASS | `docs/personal-fork-maintenance.md` and `docs/releases/0.15.0.md` now describe the strengthened verification gate while keeping actual publish/git actions manual |

## Verification Results
| Command | Result |
|---------|--------|
| `npm pack --dry-run 2>&1 | grep -E '__pycache__|\.pyc|src/python-runtime/(runtime.py|rpc.py)'` | PASS — only `src/python-runtime/runtime.py` and `src/python-runtime/rpc.py` remain in the packaged Python runtime surface |
| `bash scripts/verify-release-package.sh` | PASS — metadata, tarball shape, forbidden-entry checks, and clean temporary install proof all succeeded |
| `npm test` | PASS (`207` passing / `0` failing) |
| `npm run verify:ci` | PASS — focused verification, full verification, and release-package verification all passed |
| `npm audit --json` | PASS for unchanged baseline tracking (`0 critical / 2 high / 3 moderate / 1 low`) |

## Module Execution Reports
### Carried-forward APPLY module evidence
- `[dispatch] pre-apply`:
  - TODD(50): test infrastructure remained present and suitable for bounded verification
  - WALT(100): baseline quality snapshot confirmed at `207` passing / `0` failing
- `[dispatch] post-task`:
  - TODD(100): PASS after each task via repeated `npm test` confirmation
- `[dispatch] post-apply advisory`:
  - IRIS(250): no actionable code-review concerns in the changed packaging/script/doc files
  - DOCS(250): heuristic drift would normally flag unchanged `README.md` / `CHANGELOG.md` when `package.json` changed, but this was intentional because Phase 43 had already completed the broader publish-facing doc alignment
  - SKIP(300): captured the final packaging decision that the repo now proves tarball cleanliness and installability before a manual publish step
- `[dispatch] post-apply enforcement`:
  - WALT(100): PASS — quality baseline remained `207` passing / `0` failing with build/test/verification still green
  - DEAN(150): PASS — dependency audit baseline remained `0 critical / 2 high / 3 moderate / 1 low`
  - TODD(200): PASS — full suite stayed green after APPLY

### Pre-UNIFY dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook`

### Post-UNIFY dispatch
- `[dispatch] post-unify: WALT(100) → 1 report / 1 side effect | SKIP(200) → 1 report / 0 side effects | RUBY(300) → 1 report / 0 side effects`
- WALT report:
  - Quality delta remained stable at `207` passing / `0` failing
  - Build/typecheck remained clean via `npm run build`
  - Side effect: appended Phase 44 entry to `.paul/quality-history.md`
- SKIP report:
  - Captured the durable decision that `verify:release-package` is now the final bounded release gate for the current manual publish model
  - Captured that actual publish/tag/git actions remain intentionally manual even though package verification is now stronger
- RUBY report:
  - Complexity/debt analysis was not materially applicable because the slice was package metadata, shell verification, and documentation guidance rather than new TypeScript/runtime behavior
  - Existing repo hotspots such as `src/python-runtime/runtime.py` remain known pre-existing debt and were not reopened by this phase

## Deviations
1. **Dirty pre-existing working tree remained in force:**
   - The repository still contained unrelated tracked/untracked changes before and during Phase 44.
   - Resolution: APPLY continued with bounded edits only to the planned Phase 44 files.
   - Impact: github-flow merge/PR automation still remained manual follow-up rather than automated phase closure.
2. **Tarball cleanup landed by narrowing package inclusion instead of relying on cache-file deletion alone:**
   - The plan originally framed the work partly as removing the packaged bytecode artifact.
   - Resolution: the durable fix was to narrow `package.json` `files` entries to the intended Python runtime files and harden verification against future cache/bytecode regressions.
   - Impact: package contents are cleaner and the fix is more robust than a one-off local artifact deletion.
3. **`docs/releases/0.15.0.md` remained an untracked working-tree file in this repo state:**
   - The file already existed as part of prior documentation work but was not yet tracked in the current dirty tree snapshot.
   - Resolution: Phase 44 still updated its content in place and verified the documented release guidance.
   - Impact: the release-note content is correct for reconciliation, but git hygiene for the mixed working tree remains separate manual follow-up.

## Key Patterns / Decisions
- Fix publish-surface drift at the package boundary first: tightening `package.json` `files` is more durable than relying on cache cleanup alone.
- Treat release verification as proof, not inference: `verify:release-package` now installs the real packed tarball instead of assuming `npm pack --dry-run` is sufficient.
- Keep final release readiness bounded: stronger package verification landed without reopening runtime behavior or broader README/changelog history work.
- Preserve manual operator control for publish/git actions even after the release verification gate became strong enough to call the package surface ready.

## Next Phase
- **Phase 44 is complete.**
- **Milestone 16 — Publishable Fork Packaging is complete.**
- Next lifecycle action: start the next milestone (or perform a human review of Milestone 16 accomplishments before defining the next milestone).
