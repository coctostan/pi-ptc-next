# Repo Rename Checklist — pi-ptc-advanced@1.0.0

Repo-owned checklist for the GitHub repository rename and migration proof from `coctostan/pi-ptc-next` to `coctostan/pi-ptc-advanced`.

This checklist intentionally does **not** claim that the rename has happened. It documents the manual action, read-only proof steps, and deferral path so automated PALS APPLY can prepare and verify the migration without mutating GitHub repository settings.

## Preconditions

Before attempting the rename, confirm:

- [ ] Phase 60 / PR #17 is merged and local `main` is synced.
- [ ] `package.json` and `package-lock.json` already target `pi-ptc-advanced@1.0.0` and repository metadata for `coctostan/pi-ptc-advanced`.
- [ ] [`PUBLISH-CHECKLIST.md`](./PUBLISH-CHECKLIST.md) is complete and the publish/tag/release boundary remains manual.
- [ ] CI is green on `main` for the latest commit.
- [ ] `npm audit` baseline is unchanged (`0 critical / 0 high / 3 moderate / 0 low`).
- [ ] The user performing the action has GitHub admin rights for `coctostan/pi-ptc-next`.
- [ ] The target slug `coctostan/pi-ptc-advanced` is available or controlled by the same owner.

## Human action: GitHub repository rename

The actual GitHub repository rename is user-owned. Automated APPLY does not run `gh repo rename`, change GitHub repository settings, or otherwise mutate the remote repository.

Manual options:

1. GitHub UI: repository **Settings → General → Repository name**, rename `pi-ptc-next` to `pi-ptc-advanced`.
2. User-run CLI outside automated APPLY, if preferred and permissions allow:
   ```bash
   gh repo rename pi-ptc-advanced --repo coctostan/pi-ptc-next
   ```

After the user performs the rename, return to the PALS checkpoint with `rename-confirmed`. If the rename is intentionally left for later, return `rename-deferred`. If blocked by permissions or ownership, return `blocked: <reason>`.

## Redirect and remote migration proof

After a user-confirmed rename, use read-only checks to prove the migration path:

```bash
gh repo view coctostan/pi-ptc-advanced
git remote -v
```

Old-name redirect proof should confirm that links to `coctostan/pi-ptc-next` still land at the renamed repository, or that GitHub reports the expected redirect. GitHub usually preserves redirects for renamed repositories, but docs and package metadata should prefer the new `coctostan/pi-ptc-advanced` slug once the rename is confirmed.

Local remote migration remains manual. If the local checkout still points at the old slug, the user may update it explicitly:

```bash
git remote set-url origin git@github.com:coctostan/pi-ptc-advanced.git
# or
git remote set-url origin https://github.com/coctostan/pi-ptc-advanced.git
```

Automated APPLY should inspect `git remote -v` and report what it sees. It should not rewrite remotes without explicit user approval.

## Post-rename verification

After a confirmed rename or an explicit deferral, run the repo-local verification appropriate to that state:

```bash
node --test test/release-readiness.test.ts
npm run build
bash scripts/verify-release-package.sh
npm run verify:ci
```

Also verify:

- package metadata in `package.json` still targets `pi-ptc-advanced@1.0.0` and `coctostan/pi-ptc-advanced` for repository, homepage, and bugs URLs;
- README and [`docs/personal-fork-maintenance.md`](../personal-fork-maintenance.md) link to this checklist for the repo rename/migration sequence;
- GitHub Actions checks are green after any follow-up PR;
- old-name `coctostan/pi-ptc-next` mentions in active docs are limited to lineage, redirects, or pre/post-rename caveats.

## Deferral or rollback

If the rename is deferred, record that outcome without changing docs to past-tense completion language. The correct state is: repository rename remains intended/manual, and this checklist is the future execution path.

If a user-confirmed rename needs to be reversed, use GitHub's repository settings manually and re-run the proof steps above. GitHub redirects usually preserve old links, but the preferred public slug after confirmation should remain `coctostan/pi-ptc-advanced` unless the user explicitly chooses a different final name.

## Stop here for automated APPLY

PALS automated APPLY stops at documentation/checklist proof unless the user confirms the manual rename checkpoint. Even after confirmation, APPLY performs only read-only verification and doc/state updates. It does not run `gh repo rename`, publish to npm, create git tags, create GitHub releases, or mutate GitHub repository settings.
