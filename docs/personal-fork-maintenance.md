# Public Release Maintenance

This document is the maintainer runbook for the public `pi-ptc-advanced` package identity and the repo-local release-readiness workflow.
It covers the workflow that should remain stable across sessions:
- start Pi with the preferred analysis-oriented profile
- run the routine verification bundle for day-to-day checks
- run the full verification bundle when confidence needs to be higher
- run the CI-parity verification bundle used by GitHub Actions
- run a release-package verification pass for the current `pi-ptc-advanced@1.0.0` baseline
- handle sync, publishing, and repo rename work as explicit manual operations instead of hidden automation
The current documented release target is **`pi-ptc-advanced@1.0.0`**. This runbook covers verification-only CI automation and the package-surface verification needed for that baseline while still leaving `npm publish`, tagging, GitHub releases, and the GitHub repository rename as explicit manual concerns; see [`docs/releases/1.0.0.md`](./releases/1.0.0.md) for details.
## Day-to-day workflow
### 1. Start Pi with the analysis-oriented profile

From the repo root:

```bash
./scripts/start-pi-ptc-full-tools.sh
```

That launcher keeps mutations and bash disabled for `code_execution`, requests `sg` plus selected graph tools, and leaves `edit`, `write`, `bash`, `resolve_edge`, and `delete_edge` out of the Python surface on purpose.

If Pi does not expose one of the requested read-only tools to PTC in the current session, PTC will warn and keep that tool unavailable. The launcher is an environment/profile helper only; it does not change git state or install dependencies.

### 2. Run routine verification

For normal local maintenance, use the focused verification entrypoint:

```bash
npm run verify:personal
```
Current focused coverage:
- `npm run build`
- `node --test test/tool-registry.test.ts test/hashline-default-exposure.test.ts test/utils.test.ts test/hashline-interop-smoke.test.ts`
Use this after routine local changes, dependency refreshes that are expected to be low risk, or Pi/tool-surface checks.
### 3. Run the higher-confidence verification path when needed
For larger updates or before treating the package as revalidated, run:
```bash
npm run verify:personal:full
```
This currently runs the full repo test path via `npm test`.
Use the full path when:
- you changed multiple files
- you updated dependencies
- you rebased onto a newer upstream or fork base
- Pi changed in a way that may affect runtime/tool visibility
### 4. Run the CI-parity verification bundle
When you want to reproduce the verification path used by GitHub Actions locally, run:

```bash
npm run verify:ci
```

This command chains the focused verification bundle, the full test suite, and the release-package verification path. The repository workflow at [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) uses this repo-owned command so local and GitHub verification stay aligned.

Use it before relying on the CI workflow, after changing verification scripts, or when release-readiness needs one command that mirrors GitHub's automation.

### 5. Verify the release package surface when preparing a release candidate

When you want to confirm what would actually ship for the current release baseline, run:

```bash
npm run verify:release-package
```

This command builds the repo, validates the expected package metadata, checks the `npm pack --dry-run` tarball surface for the current **`pi-ptc-advanced@1.0.0`** target, and proves a clean install from the packed tarball in a temporary directory.

Use it before treating the package as release-ready, after metadata changes, or after documentation/dependency updates that may affect the published package surface or installability proof.

Release reference docs for the active baseline:
- [`CHANGELOG.md`](../CHANGELOG.md)
- [`docs/releases/1.0.0.md`](./releases/1.0.0.md)
- [`docs/releases/PUBLISH-CHECKLIST.md`](./releases/PUBLISH-CHECKLIST.md)
- [`docs/releases/REPO-RENAME-CHECKLIST.md`](./releases/REPO-RENAME-CHECKLIST.md)
- Previous baseline: [`docs/releases/0.18.0.md`](./releases/0.18.0.md)
- Historical baseline: [`docs/releases/0.16.0.md`](./releases/0.16.0.md)
- Historical baseline: [`docs/releases/0.15.0.md`](./releases/0.15.0.md)
- Historical baseline: [`docs/releases/0.8.0.md`](./releases/0.8.0.md)
## Manual sync and upgrade boundary

Git and remote operations are intentionally kept manual for this package.

That means this repo documents the process, but does **not** automate:
- remote creation
- fetch/rebase strategy
- branch selection
- push / force-push
- PR creation or merge

Those steps stay user-directed because they depend on your remotes, branch policy, and tolerance for history rewriting.
The GitHub repository rename/migration path from `coctostan/pi-ptc-next` to `coctostan/pi-ptc-advanced` is documented separately in [`docs/releases/REPO-RENAME-CHECKLIST.md`](./releases/REPO-RENAME-CHECKLIST.md).

### Suggested manual sync checklist

If you maintain this fork against another branch or upstream repository, use an explicit flow such as:

```bash
# inspect remotes and current branch
git remote -v
git branch --show-current

# fetch whichever remote you treat as the source of truth
git fetch origin
# or: git fetch upstream

# rebase or merge manually according to your preference
# example only:
# git rebase origin/main

# then re-run repo-local verification
npm run verify:personal
npm run verify:personal:full
```

If a rebase or merge needs conflict resolution, handle that manually first, then re-run verification before pushing anything.

## What this workflow still does not automate
- CHANGELOG maintenance and release notes beyond the current documented baseline
- automated tagging or npm publish flow
- PR automation
- remote creation/fetch/rebase/push strategy decisions
- automated tagging or manual-operator publish execution beyond the documented verification gate (the repo proves tarball cleanliness/installability, but the actual release/publish step remains manual)
- reopening the archived upstream-submission prep flow (see `.paul/milestones/0.6.0-UPSTREAM-PR-ARTIFACTS.md` for historical reference only)
The repo includes a verification-only CI workflow, but release publication and git workflow choices remain separate manual concerns.

## Quick reference
```bash
# start the preferred local Pi profile
./scripts/start-pi-ptc-full-tools.sh
# routine maintenance verification
npm run verify:personal
# higher-confidence verification
npm run verify:personal:full
# GitHub Actions parity verification
npm run verify:ci
# release-package verification
npm run verify:release-package
```

## Related files
- `scripts/start-pi-ptc-full-tools.sh`
- `scripts/verify-personal-fork.sh`
- `scripts/verify-ci.sh`
- `scripts/verify-release-package.sh`
- `.github/workflows/ci.yml`
- `README.md`
- `LICENSE`
