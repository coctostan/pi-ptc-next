# Project State

## Project Reference
See: `.paul/PROJECT.md`

**Core value:** `pi-ptc-next` should execute the same active Pi tool implementations that the user sees in chat.
**Current focus:** Milestone 17 will audit `pi-ptc-advanced` against local and latest Pi compatibility surfaces, then optimize extension integration and system-prompt/tool guidance.
## Current Position
Milestone: Milestone 17 — Pi Compatibility and Prompt Integration Audit (0.16.0)
Phase: 46 of 48 (Pi Extension Runtime Alignment)
Plan: Not started
Status: Ready to plan
Last activity: 2026-05-11 — Phase 45 complete, transitioned to Phase 46
Progress:
- Milestone 17 — Pi Compatibility and Prompt Integration Audit: [███░░░░░░░] 25% (Phase 45 ✓)
- Phase 45 — Pi API and Documentation Delta Audit: [██████████] 100% ✓
- Milestone 15 — Bug Fixes and Helper Hardening: [██████████] 100% ✓
- Milestone 16 — Publishable Fork Packaging: [██████████] 100% ✓
- Phase 42 — Rename and Package Identity: [██████████] 100% ✓
- Phase 43 — Publish Metadata and Documentation: [██████████] 100% ✓
- Phase 44 — Release Verification and Publish Readiness: [██████████] 100% ✓
- Phase 39 — P0 File-Discovery Repair: [██████████] 100% ✓
- Phase 40 — Error-Handling Hardening: [██████████] 100% ✓
- Phase 41 — Behavior Consistency and Follow-Up Proof: [██████████] 100% ✓
- Milestone 14 — Live Tool Audit and Stress Testing: [██████████] 100% ✓
- Phase 36 — Systematic Functionality Audit: [██████████] 100% ✓
- Phase 37 — Stress and Edge Case Testing: [██████████] 100% ✓
- Phase 38 — Composition Patterns and Audit Scorecard: [██████████] 100% ✓
- Milestone 13 — Ecosystem Examples and Recipes: [██████████] 100% ✓
- Phase 35 — Proof and Ecosystem Documentation: [██████████] 100% ✓
- Phase 34 — Cross-Repo Recipes and Benchmark Fixtures: [██████████] 100% ✓
- Phase 33 — Recipe Targets and Example Contracts: [██████████] 100% ✓
- Milestone 12 — High-Level Orchestration Helpers: [██████████] 100% ✓
- Phase 32 — Proof and Ecosystem Docs: [██████████] 100% ✓
- Phase 31 — Bounded Reduction and Output-Budget Helpers: [██████████] 100% ✓
- Phase 30 — Core Orchestration Primitives: [██████████] 100% ✓
- Milestone 11 — Result-Kind and Tool Introspection Helpers: [██████████] 100% ✓
- Phase 29 — Proof and Docs: [██████████] 100% ✓
- Phase 28 — Python Tool Introspection: [██████████] 100% ✓
- Milestone 10 — Typed Response and File Handle Helpers: [██████████] 100% ✓
- Milestone 9 — Release Readiness and Packaging: [██████████] 100% ✓
- Phase 24 — CI and Release Verification: [██████████] 100% ✓
- Phase 23 — Changelog and Release Notes: [██████████] 100% ✓
- Phase 22 — Release Version and Packaging: [██████████] 100% ✓
- Milestone 8 — Personal Fork Hardening: [██████████] 100% ✓
- Milestone 7 — Upstream PR Preparation: [██████████] 100% ✓
- Milestone 6 — Review Findings Remediation: [██████████] 100% ✓
- Milestone 5 — Python Helper Normalization: [██████████] 100% ✓
- Milestone 4 — Cross-Extension Tool Execution Bridge: [██████████] 100% ✓
- Milestone 3 — Python Ergonomics and Metadata: [██████████] 100% ✓
- Milestone 2 — Structured Results Contract: [██████████] 100% ✓
- Milestone 1 — Active Tool Runtime Seam: [██████████] 100% ✓
Current loop state:
```text
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Phase 46 ready to plan]
```

## Accumulated Context
### Decisions
- Personal fork ownership is now the primary path; upstream PR preparation is retained only as optional reference material
- Phase 39 APPLY fixed `ptc.find_files()` to avoid `glob(limit=...)` dependency and normalize string/list glob payloads before slicing, then converted the three Phase 36 known-bug assertions into passing bounded regression proof
- Phase 39 UNIFY reconciled plan-vs-actual into `39-01-SUMMARY.md`, recorded post-unify quality history, and transitioned the project to Phase 40
- Phase 19 restored a repo-local personal analysis launcher profile at `scripts/start-pi-ptc-full-tools.sh`
- `PTC_CALLABLE_TOOLS` is now treated explicitly as a filter over Pi-visible tools, not as a loader for missing tools
- Allowlisted-but-unavailable tools now produce explicit registry warnings instead of silent callable-surface mismatches
- Default conservative callable-tool behavior for non-personal sessions remains unchanged
- Phase 20 keeps routine verification repo-local (`npm run verify:personal`, `npm run verify:personal:full`) while leaving git remote/branch/rebase/push actions manual and documented
- Milestone 7 upstream PR-prep material now lives behind `.paul/milestones/0.6.0-UPSTREAM-PR-ARTIFACTS.md`, and current maintainer docs treat it as archived reference only
- Phase 22 set the fork's package/release baseline to 0.8.0, added fork repository metadata, and introduced repo-local `verify:release-package` tarball verification
- Phase 23 added a durable `CHANGELOG.md`, dedicated `0.8.0` release notes, and maintainer-doc links that describe the personal fork release baseline conservatively
- Phase 24 added a repo-local `verify:ci` command, a verification-only GitHub Actions workflow at `.github/workflows/ci.yml`, and maintainer/release-doc updates that keep publish/tag/git automation explicitly manual
- Untracked file additions in this repo still require `git status` alongside `git diff` during task proof because plain `git diff --name-only` does not surface newly created files before staging
- Phase 25 established a bounded response/file handle contract around existing `pi-web-tools` `responseId` / `filePath` flows without changing `normalizeToolResult()` return shapes
- Public contract coverage now uses an ESM-safe test harness with `createRequire(import.meta.url)` so dist import checks stay valid under Node's module parsing
- Phase 26 added bounded Python handle helpers via `ptc.extract_handles()` / `ptc.first_handle()` instead of changing normalized tool return shapes
- Response/file follow-up workflows are now proven inside `code_execution` and documented in both README guidance and the live tool description
- Phase 27 added `ptc.expect_kind(value, kind)` as a strict top-level kind assertion helper and intentionally kept broader validation/introspection work out of scope
- Bounded Python helper slices should prefer dedicated focused runtime tests over growing the already-large `test/code-executor.test.ts` without a concrete need
- Graph-handle helper ergonomics remain explicitly deferred until adjacent repos expose a stable public contract worth adopting
- Phase 28 derives Python callable-tool introspection metadata from the same live `ToolInfo[]` wrapper-generation surface and exposes only bounded JSON-safe session metadata to `runtime.py` for `ptc.list_callable_tools()` / `ptc.get_tool_schema(name)`
- Phase 29 adds dedicated execution-level proof for `ptc.list_callable_tools()` / `ptc.get_tool_schema(name)` plus README and tool-description guidance without reopening Phase 28 runtime plumbing
- Safe optional-tool branching guidance now points models at `ptc.list_callable_tools()` as the authoritative live session surface before calling optional helpers like `sg`
- Phase 30 keeps orchestration call specs bounded to `{"tool": str, "params": object}` and validates them in `runtime.py` rather than introducing a broader orchestration DSL
- `ptc.first_success(...)` now uses ordered sequential fallback semantics in Phase 30; `max_concurrency` is validated for interface consistency, while broader concurrent race behavior remains deferred
- `ptc.fit_output(...)` now defaults to the executor session output cap so Python-side compaction stays aligned with the real final output boundary
- Phase 31 intentionally returns structured preview metadata from `ptc.fit_output(...)` instead of collapsing immediately to an opaque string
- Phase 32 closed Milestone 12 with focused ecosystem proof/docs in `README.md`, `src/index.ts`, and dedicated focused tests instead of reopening runtime semantics
- README and generated `code_execution` guidance now both document `ptc.batch_tool(...)`, `ptc.first_success(...)`, `ptc.reduce_tool(...)`, and `ptc.fit_output(...)` with compact hashline/codegraph/web examples and contract coverage
- Milestone 12 verification improved from `127` passing / `0` failing to `132` passing / `0` failing while the dependency audit baseline stayed unchanged
- 2026-03-26: Task 3 retry corrected an expected recipe workflow string in `test/benchmark-runner.test.ts`; no runtime/product contract change was required
- Phase 33 kept the first M4 slice additive by introducing optional `recipe_target` eval metadata, benchmark passthrough, and four deterministic seeded recipe cases instead of a broader recipe DSL
- The touched Phase 33 benchmark/eval tests now use import-based syntax and `process.cwd()` path resolution so the modified files pass targeted TypeScript diagnostics without changing package-wide module mode
- Phase 34 keeps cross-repo recipe artifacts under `.pi/evals/ptc/recipes/` plus a deterministic recipe-only benchmark baseline at `.pi/evals/ptc/baselines/local__seeded__recipes.json`, without changing runtime/helper/doc surfaces
- Because `.pi/` is gitignored in this fork, Phase 34 proof for recipe artifacts relies on direct file existence/content checks plus focused eval/benchmark tests instead of git diff/status alone
- Phase 34 kept the planned scope additive even though the focused test edits landed early during APPLY to lock artifact and baseline alignment coherently
- Phase 40 APPLY hardened pre-terminal RPC close classification in `src/rpc-protocol.ts` so syntax/traceback stderr now surfaces actionable `PtcPythonError` context, added focused protocol regression coverage, and updated live-audit expectations; verification passed with `npm run build`, `node --test test/rpc-protocol.test.ts`, `node --test test/live-audit-pipeline.test.ts`, and `npm test` (205 pass / 0 fail)
- APPLY preflight detected a dirty working tree with pre-existing out-of-scope changes; execution proceeded with warning to keep Phase 40 edits bounded to planned files
- Phase 40 UNIFY reconciled plan-vs-actual into `40-01-SUMMARY.md`, recorded post-unify module reports and quality-history trend, and transitioned Milestone 15 flow to Phase 41 planning readiness
- Phase 40 UNIFY deferred github-flow merge-gate automation because the working tree still contained mixed pre-existing out-of-scope changes; reconciliation artifacts were completed and the next phase was unlocked while git/PR cleanup remains follow-up work
- Phase 41 APPLY added explicit `batch_tool(..., on_error='collect')` bounded partial mode (`kind: "batch_partial"`) while preserving default fail-fast behavior, aligned `batch_tool([])` with list-style empty results, and tightened executor truncation framing to enforce `maxOutputChars` caps
- Phase 41 proof updated focused orchestration/stress/pipeline/contracts plus README/tool-description helper guidance; full verification passed with `npm test` (`207` passing / `0` failing)
- Phase 41 UNIFY reconciled plan-vs-actual into `41-01-SUMMARY.md`, recorded post-unify module outputs and quality-history update, and marked Milestone 15 complete pending next milestone routing
- Phase 42 APPLY renamed package metadata to `pi-ptc-advanced` at `0.15.0`, updated `scripts/verify-release-package.sh` to assert the new package name/version baseline, preserved README/docs naming drift intentionally for Phase 43, and verified with `npm test`, `npm run build`, and `bash scripts/verify-release-package.sh`; `npm pack --dry-run` still includes `src/python-runtime/__pycache__/runtime.cpython-314.pyc`, which is non-blocking for this phase but should be reviewed during publish-readiness follow-up
- Phase 42 APPLY preflight detected the same dirty working tree with pre-existing out-of-scope changes; execution proceeded with warning while keeping edits bounded to `package.json`, `package-lock.json`, and `scripts/verify-release-package.sh`
- Phase 42 APPLY did not run github-flow postflight commit/push/PR automation because the branch still contains mixed pre-existing out-of-scope changes; auto-staging with `git add -A` would have swept unrelated work into the phase commit, so git/PR handling remains manual follow-up
- Phase 42 UNIFY reconciled plan-vs-actual into `42-01-SUMMARY.md`, appended stable quality history for the metadata/package-identity slice, marked Phase 42 complete in roadmap/project state, and routed Milestone 16 to Phase 43 planning readiness while keeping merge-gate/git hygiene as manual follow-up because the working tree still contains mixed historical changes
- Phase 43 UNIFY reconciled plan-vs-actual into `43-01-SUMMARY.md`, recorded stable quality history for the documentation-alignment slice, and transitioned Milestone 16 to Phase 44 planning readiness while keeping publish-readiness/tarball cleanup work explicitly deferred
- Phase 44 UNIFY reconciled the final publish-readiness slice into `44-01-SUMMARY.md`, recorded stable quality history for the packaging/installability gate, and closed Milestone 16 with the manual-publish boundary still explicit
- 2026-05-11: DEAN pre-plan enforcement for Phase 45 found current npm audit findings (1 critical / 4 high / 5 moderate); user approved override and `.paul/dean-baseline.json` now records the pre-existing dependency-risk baseline for 30 days.
- Plan 45-01 is audit-only: produce `.paul/phases/45-pi-api-and-documentation-delta-audit/45-01-PI-COMPAT-AUDIT.md` before any runtime or prompt-guidance implementation.
- Phase 45 APPLY produced `.paul/phases/45-pi-api-and-documentation-delta-audit/45-01-PI-COMPAT-AUDIT.md` (271 lines): evidence baseline confirms local install equals latest published Pi (`@earendil-works/pi-coding-agent@0.74.0`); 18-row compatibility matrix; 6 prompt-integration findings; Phase 46/47/48 handoff with 6 explicit deferrals.
- Phase 45 APPLY top-level findings: R-1 build-time peer scope drift (`@mariozechner/*@0.55.1` vs runtime `@earendil-works/*@0.74.0`) is the gating risk; R-2 `code_execution` lacks `promptSnippet`/`promptGuidelines` so it is invisible in the default system prompt's `Available tools` section; R-3 hashline executor bridge has no observability signal when no executors are emitted.
- Phase 45 APPLY GitHub Flow postflight pushed commit 6fef3f4 to `feat/hashline-native-interop` and opened PR #1 against `main`; CI "Verify release baseline" reports FAILURE due to a pre-existing GitHub Actions Node 20.20.2 runner `ERR_UNKNOWN_FILE_EXTENSION` on `node --test test/*.test.ts`, which is unrelated to the audit-only artifact and is surfaced for UNIFY/Phase 48 to address.

### Deferred Issues
- Bridge teardown when pi adds getToolExecutor()
- `src/python-runtime/runtime.py` is now a significant debt hotspot at 743 lines after Phase 41 behavior additions; future changes should avoid casual growth without extraction justification
- Existing docs/test hotspots remain in `README.md` (853 lines), `src/index.ts` (424 lines), and `test/index.test.ts` (1220 lines); future proof/docs work should keep using focused companion files or extract sections before growing those anchors further
- Full-suite verification now passes at `207` passing / `0` failing after Phase 41 APPLY; maintain this as the new baseline for subsequent milestones
- Phase 44 removed packaged Python bytecode/cache artifacts from the tarball surface and added packed-artifact installability proof; preserve this publish-surface invariant in future release work

### Git State
- Last committed checkpoint: `6fef3f4` (`docs(phase-45): pi compat audit (45-01)`) on `feat/hashline-native-interop`
- Branch: `feat/hashline-native-interop` (pushed to origin)
- Open PR: [#1](https://github.com/coctostan/pi-ptc-next/pull/1) `feat/hashline-native-interop -> main` (mergeable; CI `Verify release baseline` FAILURE due to pre-existing Actions Node 20.20.2 `.ts` runner issue)
- Tags: `0.14.0` remains on the earlier Milestone 14 handoff checkpoint; validate tag/version alignment before any publish action
## Session Continuity
Last session: 2026-05-11
Stopped at: Phase 45 complete (PLAN/APPLY/UNIFY ✓); transitioned to Phase 46 planning readiness
Next action: /paul:plan for Phase 46
Resume file: .paul/ROADMAP.md
Resume context:
- Phase 45 audit handoff lives in `.paul/phases/45-pi-api-and-documentation-delta-audit/45-01-PI-COMPAT-AUDIT.md` §4; Phase 46 should sequence runtime work as 46-A (peerDependencies scope decision, gating), 46-B (remove `context` event cast), 46-C (hashline bridge visibility warning), 46-D (`sourceInfo` adoption strategy).
- Phase 45 PR #1 is open on `feat/hashline-native-interop -> main`; the Actions "Verify release baseline" CI failure is a pre-existing Node 20.20.2 `.ts` runner issue, not a Phase 45 regression, and is deferred to Phase 48 or a `/paul:fix` loop.
- DEAN dependency-audit baseline at `.paul/dean-baseline.json` remains user-approved; do not remediate dependencies inside Phase 46 unless a finding directly requires it.

---
*STATE.md — Updated after Phase 45 UNIFY + transition to Phase 46 (last updated: 2026-05-11)*