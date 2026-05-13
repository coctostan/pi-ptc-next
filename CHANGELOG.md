# Changelog

This changelog tracks notable release-facing changes for the fork repository `pi-ptc-next` and its current publish target `pi-ptc-advanced`.

## Unreleased

_No unreleased changes yet._

## 1.0.0 — 2026-05-13

`1.0.0` establishes the public `pi-ptc-advanced` identity baseline. Package metadata, package-lock root metadata, release verification, and active user-facing release docs now target `pi-ptc-advanced@1.0.0` and the intended `coctostan/pi-ptc-advanced` public repository identity.

### Changed

- Package repository, homepage, bugs URL, version, and lockfile metadata now target `pi-ptc-advanced@1.0.0`.
- Release-readiness tests and `scripts/verify-release-package.sh` enforce the 1.0.0 baseline.
- README and maintainer runbook now open with public package/product framing instead of fork-first `pi-ptc-next` framing.
- Active release docs point to `docs/releases/1.0.0.md`; older release notes remain historical context.

### Deferred / not included

- Automated `npm publish`, git tags, GitHub releases, and the actual GitHub repository rename remain manual/user-owned and were not performed by this baseline update.

## 0.18.0 — 2026-05-13

`0.18.0` closes Milestone 19 — Live Runtime Helper Hardening. The release tightens the live `code_execution` surface (runner availability and shell-quoted command reporting, async callable wrapper contract, consistent positional-argument behavior across wrappers, normalized read results, and opt-in partial-error envelopes for `read_many` / `batch_tool`), closes out the live-audit issue note, and adds a curated `ptc.list_helpers()` inventory as the counterpart to `ptc.list_callable_tools()`.

### Added

- `ptc.list_helpers() -> list[dict[str, Any]]` returns a deterministic, JSON-safe inventory of `ptc.*` helpers (each entry carries `name`, `signature`, and a one-line `summary`). It is the helper-side counterpart to `ptc.list_callable_tools()`, which lists callable Pi tools.
- Live-audit regression coverage for the remaining helper edge cases (issues 1, 4, 5, 8, 9): runner-unavailable shape and shell-quoted `metrics.command`, callable-vs-helper distinction, positional-argument behavior across `read`/`grep`/`glob`/`find`/`ls`, `details.ptcValue` override preservation at the callable boundary, and shell-quoted patterns for `ptc.run_tests`.

### Changed

- `find`, `glob`, and `ls` Python wrappers now accept at most 1 positional argument and raise a wrapper-named `TypeError` on excess positionals, matching the existing behavior of `read` and `grep` (Phase 55 + Phase 57).
- `ptc.run_tests(pattern)` `metrics.command` is shell-quoted via `shlex.join`, and `metrics.runner_available` (bool) is recorded in the report (Phase 54, regression-pinned in Phase 57).
- `ptc.read_many(...)` accepts opt-in `on_error='collect'` and returns a typed partial envelope (`kind="read_many_partial"`) instead of raising on the first failure (Phase 56).
- `ptc.batch_tool(..., on_error='collect')` classifies tool-level normalized error payloads as failed entries (`ok: false, error: summary`) while preserving the raw payload under `value` (Phase 56).
- Path normalization invariant documented across direct wrappers, `ptc.read_*` helpers, and `ptc.batch_tool` read/grep payloads (Phase 56).
- README and the generated `code_execution` tool description distinguish `ptc.list_callable_tools()` (callable Pi tools) from `ptc.list_helpers()` (`ptc.*` helpers); README retains the `details.ptcValue` callable-boundary callout.
- Package metadata and release-package verification now target `pi-ptc-advanced@0.18.0`.
- `docs/issues/2026-05-13-code-execution-helper-edge-cases.md` records explicit per-issue resolution status for all ten live-audit items.

### Security / Audit

- Dependency audit posture improved during Milestone 19: `npm audit --json` reports `0 critical / 0 high / 3 moderate / 0 low` (down from the Phase 48 baseline of `4 critical / 0 high / 3 moderate / 0 low`).
- `.paul/dean-baseline.json` (Phase 48 acknowledgement, valid through 2026-06-11) is retained as historical context; it is materially superseded by the improved audit posture and is not relied on by `0.18.0` plan creation.

### Verification

- Phase 57 verification: `node --test test/live-audit-helpers.test.ts` 29/29 passing with the five new `issue-N` cases; full `npm test` baseline carried forward unchanged.
- `npm run build` clean.
- `bash scripts/verify-release-package.sh` passes against the `0.18.0` baseline.

### Deferred / not included

- Automated publish remains manual; `scripts/verify-release-package.sh` validates the release surface but does not publish to a registry.
- Cross-runner support for vitest / jest / pytest / package-script dispatch in `ptc.run_tests(pattern)` remains intentionally out of scope.
- Extraction of `src/python-runtime/runtime.py` (now grown by the bounded `list_helpers` + positional-normalization inserts) remains an IRIS debt flag carried forward to a future milestone.
## 0.17.0 — 2026-05-12

### Added
- Completed `code_execution` results now expose the executed Python source in expanded tool details while keeping the default completed result compact.
- `code_execution` prompt guidance now clarifies when to prefer `nu` for pipeline-style structured-data/filesystem analysis versus Python-backed orchestration for custom logic and aggregation.
- `ptc.report(...)` adds a JSON-safe structured report helper for title/metrics/tables/samples/warnings.
- Completed `code_execution` reports now render compact structured summaries by default, expand to fuller rows/samples/warnings, and preserve the report object in `details.report` / `details.reportProduced`.
- Free-form returns and `ptc.fit_output(...)` remain unchanged when they are not the recognized `ptc_report` shape.
- `code_execution` Python helpers now support root-aware path formatting options on `ptc.find_files(...)`, `ptc.find_files_abs(...)`, and `ptc.read_tree(...)`.
- `ptc.tabulate(...)` and shallow `ptc.diff(...)` add slim bridge helpers for composing Python intermediates into `ptc.report(...)` without adding broad data-analysis helpers.
- Callable-tool introspection now carries optional prompt metadata into Python and adds `ptc.help(tool_name)` for bounded on-demand runtime guidance.
- `ptc.run_tests(pattern)` adds a first-class Node `node --test` helper that returns a structured `ptc_report` with pass/fail/duration metrics, a bounded failures table, runner-availability data, and a fixed 120s timeout. Failing tests, missing `node`, and timeouts are reported as data; invalid patterns still raise `ValueError`. Cross-runner support, package-script dispatch, and Docker image changes remain explicitly out of scope for this release.

### Changed
- Package metadata and release-package verification now target `pi-ptc-advanced@0.17.0`.
- The active documented release baseline now points to `0.17.0`; `0.16.0`, `0.15.0`, and `0.8.0` remain available as historical release context.

### Deferred / not included
- Automated npm publish and release GitHub Actions automation remain intentionally out of scope.
- Caching, cross-call session state, helper persistence, broad PTC aggregator helpers, and cross-runner test dispatch remain deferred.
- The dependency audit baseline remains unchanged at `0 critical / 0 high / 3 moderate`.
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