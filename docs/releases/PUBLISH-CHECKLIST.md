# Publish Checklist — pi-ptc-advanced@1.0.0

Repo-owned release-gate checklist for `pi-ptc-advanced@1.0.0`. This document is the canonical path from a green working tree to a published package and post-publish manual steps. Automated PALS APPLY runs the dry-run portion only; everything under **Manual publish** and **Post-publish manual steps** is user-owned.

This checklist pairs with [`1.0.0.md`](./1.0.0.md) (release note) and the release-readiness drift tests at `test/release-readiness.test.ts`, which guard the headings and language below.

## Preconditions

Before starting any dry-run or publish work, confirm:

- [ ] Local branch is `main` and fast-forwarded against `origin/main` (clean working tree, no untracked files outside `.paul/`).
- [ ] CI is green on `main` for the latest commit (`.github/workflows/ci.yml`).
- [ ] `package.json` `name` is `pi-ptc-advanced` and `version` is `1.0.0`.
- [ ] `package-lock.json` root `name`/`version` match.
- [ ] `npm audit` baseline is unchanged from `.paul/dean-baseline.json` (currently `0 critical / 0 high / 3 moderate / 0 low`, acknowledged through 2026-06-11).
- [ ] Active release docs (`docs/releases/1.0.0.md`) and `CHANGELOG.md` reflect the intended public framing — no premature publish/tag/release/rename claims.

## Dry-run

Run, in order, from the repo root. All commands must exit `0`:

1. `npm test` — full Node test suite (includes `release-readiness.test.ts` drift guards).
2. `npm run build` — clean TypeScript build.
3. `bash scripts/verify-release-package.sh` — packs the tarball, inspects metadata, and clean-installs `pi-ptc-advanced-1.0.0.tgz` into a temporary directory.
4. `npm run verify:ci` — same path GitHub Actions runs, so local and CI verification stay aligned.
5. `npm pack --dry-run` — confirm the tarball surface. Expected tarball name: `pi-ptc-advanced-1.0.0.tgz`. Spot-check the file list for unexpected entries (e.g., stray `__pycache__`, `.paul/`, or test fixtures).
6. `npm publish --dry-run` — final pre-publish check. Requires a local `npm login` session, but does **not** transmit the tarball or create a registry version. Confirm the printed package name/version match `pi-ptc-advanced@1.0.0`.

If any step fails or surfaces an unexpected diff, stop and fix on a branch + PR before continuing. Do not skip steps to "save time" — the dry-run is the gate.

## Manual publish

These steps are user-owned. Automated PALS APPLY does not run them.

1. `npm login` — authenticate as the user account that owns the `pi-ptc-advanced` name on the npm registry.
2. `npm whoami` — confirm the expected account is active.
3. `npm publish --access public` — `pi-ptc-advanced` is unscoped and intended to be public, so `--access public` is required for the first publish.
4. `npm view pi-ptc-advanced version` — confirm the published version is `1.0.0`.
5. `npm view pi-ptc-advanced dist-tags` — confirm `latest` points to `1.0.0`.

If publish fails (auth, name conflict, two-factor prompt), do not retry blindly. Capture the error, resolve the cause (account access, OTP, naming), and re-run the **Dry-run** section before attempting publish again.

## Post-publish manual steps

After a confirmed successful publish, the user performs the following manual steps. Automated APPLY does not perform any of these.

1. **Tag the release:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
2. **Create the GitHub release** (uses the existing release note as the body):
   ```bash
   gh release create v1.0.0 --notes-file docs/releases/1.0.0.md --title "pi-ptc-advanced 1.0.0"
   ```
3. **GitHub repo rename** (deferred to the repo-rename checklist): renaming `coctostan/pi-ptc-next` → `coctostan/pi-ptc-advanced`, updating remotes, and refreshing README/runbook links follows [`REPO-RENAME-CHECKLIST.md`](./REPO-RENAME-CHECKLIST.md), not the publish checklist itself.
4. **Update install instructions:** once publish is confirmed, README/runbook can switch from Git-source install language to `npm install pi-ptc-advanced` / `pi install pi-ptc-advanced`. That edit is a separate, user-confirmed change — not part of this checklist.

## Stop here for automated APPLY

PALS automated APPLY stops before `npm publish`. The **Manual publish** and **Post-publish manual steps** sections above are explicit, user-owned operations and remain outside any automated lifecycle run. APPLY's job ends with green dry-run evidence and an open PR; the user owns publish/tag/release/rename from that point.
