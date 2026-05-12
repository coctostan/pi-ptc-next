# Changelog

This changelog tracks notable release-facing changes for the fork repository `pi-ptc-next` and its current publish target `pi-ptc-advanced`.

## Unreleased

### Added
- Completed `code_execution` results now expose the executed Python source in expanded tool details while keeping the default completed result compact.
- `code_execution` prompt guidance now clarifies when to prefer `nu` for pipeline-style structured-data/filesystem analysis versus Python-backed orchestration for custom logic and aggregation.
- `ptc.report(...)` adds a JSON-safe structured report helper for title/metrics/tables/samples/warnings.
- Completed `code_execution` reports now render compact structured summaries by default, expand to fuller rows/samples/warnings, and preserve the report object in `details.report` / `details.reportProduced`.
- Free-form returns and `ptc.fit_output(...)` remain unchanged when they are not the recognized `ptc_report` shape.
- `code_execution` Python helpers now support root-aware path formatting options on `ptc.find_files(...)`, `ptc.find_files_abs(...)`, and `ptc.read_tree(...)`.
- `ptc.tabulate(...)` and shallow `ptc.diff(...)` add slim bridge helpers for composing Python intermediates into `ptc.report(...)` without adding broad data-analysis helpers.

## 0.16.0 — 2026-05-12

### Added
- `code_execution` now registers Pi prompt metadata (`promptSnippet` and active-only `promptGuidelines`) so the default system prompt exposes when to use Python-backed batching, aggregation, and compact results.
- PTC-managed custom tools now preserve user-authored `promptSnippet` and `promptGuidelines` when registering with Pi.
- A durable Pi compatibility audit at `.paul/phases/45-pi-api-and-documentation-delta-audit/45-01-PI-COMPAT-AUDIT.md` covering the compatibility delta and prompt-integration findings.
- A no-executor observability warning in the hashline executor bridge while preserving builtin fallback.
- A focused release-readiness regression test at `test/release-readiness.test.ts` that prevents stale release metadata, doc-link, audit-caveat, and verification-script drift.
- `docs/releases/0.16.0.md` documenting the Milestone 17 compatibility-proof and release-readiness baseline.

### Changed
- Package metadata and release-package verification now target `pi-ptc-advanced@0.16.0`.
- The active documented release baseline now points to `0.16.0`; `0.15.0` and `0.8.0` remain available as historical release context.
- The local compatibility target remains the latest Mario-scope Pi packages (`@mariozechner/*@0.73.1`); this is explicitly not a hard `@earendil-works/*` migration.
- Prompt-time auto-routing skips duplicate routing text when Pi `systemPromptOptions` already include equivalent `code_execution` guidance.

### Deferred / not included
- Automated tagging, npm publish, and release GitHub Actions automation remain intentionally out of scope.
- Bridge teardown still depends on Pi exposing `getToolExecutor()` on `ExtensionAPI`.
- The dependency audit is explicitly **not** clean for this release. `npm audit --json` currently reports `4 critical / 0 high / 3 moderate / 0 low`; this baseline is recorded in `.paul/dean-baseline.json` and valid through `2026-06-11`. Remediation is deferred and treated as a separate manual decision before any publish action.

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