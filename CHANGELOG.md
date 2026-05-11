# Changelog

This changelog tracks notable release-facing changes for the fork repository `pi-ptc-next` and its current publish target `pi-ptc-advanced`.

## 0.15.0 — 2026-03-27

### Added
- A publishable-fork package baseline under the name `pi-ptc-advanced`.
- Release-facing documentation alignment for the `0.15.0` baseline, including README install guidance, maintainer runbook updates, and `docs/releases/0.15.0.md`.
- Explicit fork-lineage documentation connecting the original upstream, the prior `pi-ptc-next` fork identity, and the current `pi-ptc-advanced` package target.

### Changed
- Package metadata and release-package verification now target `pi-ptc-advanced@0.15.0`.
- The active documented release baseline now points to `0.15.0`, while `0.8.0` remains available as historical release context.
- Maintainer guidance now distinguishes the stable repository lineage (`pi-ptc-next`) from the package publish surface (`pi-ptc-advanced`).

### Deferred / not included
- Final publish-readiness checks such as installability review and tarball cleanup remain Phase 44 follow-up work.
- Automated tagging, publish automation, and git workflow automation are still intentionally out of scope.
- The known dependency audit baseline remains unchanged at `0 critical / 2 high / 3 moderate / 1 low`.

## 0.8.0 — 2026-03-25

### Added
- Repo-local `verify:release-package` validation that builds the project and checks the `npm pack --dry-run` tarball surface.
- Repo-local `verify:ci` validation that chains the focused suite, the full test suite, and release-package verification.
- A verification-only GitHub Actions workflow at `.github/workflows/ci.yml`.
- A checked-in `LICENSE` file so the package surface now matches the declared MIT license metadata.
- Fork package metadata pointing at `coctostan/pi-ptc-next`.
- Personal-fork release documentation and maintainer guidance for the original `0.8.0` baseline.

### Changed
- Package and project version markers were aligned to `0.8.0` for the first coherent personal-fork release baseline.
- `code_execution` continues to use the same active Pi tool implementations visible in chat, including the established hashline-native `read` / `grep` / `edit` interop path.
- The personal maintenance workflow now has four stable repo-local verification paths:
  - `npm run verify:personal`
  - `npm run verify:personal:full`
  - `npm run verify:ci`
  - `npm run verify:release-package`
### Highlights carried into this historical baseline
- Active overridden builtin tools resolve through the same Pi executors the user sees in chat.
- Structured `details.ptcValue` payloads flow across the RPC boundary unchanged when active tools provide them.
- Python helper contracts and generated wrappers expose richer structured anchored result models for builtin tooling.
- Personal-fork maintenance became the active operational path, while the old upstream PR-prep flow moved to archived reference material only.

### Deferred / not included
- Release verification was automated in CI, but automated tagging, publish automation, and git workflow automation were not part of the repo-local workflow.
- The dependency audit baseline at that time remained `0 critical / 2 high / 1 moderate / 1 low`.
- Bridge teardown when Pi exposes `getToolExecutor()` remained future work.