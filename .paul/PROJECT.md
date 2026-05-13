# Project: @cegersdo/pi-ptc

## What This Is
A `pi-ptc-next` enhancement that makes `code_execution` invoke the same active Pi tool implementations the user sees in chat, including hashline-native `read`, `grep`, and `edit` overrides. This removes split-brain tool behavior and incrementally establishes native structured hashline interop for Python workflows.

## Core Value
`pi-ptc-next` should execute the same active Pi tool implementations that the user sees in chat, so `code_execution` gets trustworthy hashline-native `read`/`grep`/`edit` behavior without split-brain tool semantics.

## Current State
| Attribute | Value |
|-----------|-------|
| Version | 0.18.0 release baseline complete (Milestone 19) |
| Status | Milestone 19 complete — ready for next milestone or manual release decision |
| Last Updated | 2026-05-13 after Phase 57 UNIFY |

## Requirements
### Validated (Shipped)
- [x] Python code execution is available through `code_execution`
- [x] PTC supports callable tool registration, sandbox/runtime execution, and custom tool loading
- [x] `code_execution` resolves overridden builtin tool names (`read`, `grep`, `edit`) to the same active Pi executors used in chat — Milestone 1
- [x] Builtin fallback behavior remains intact when no override is present — Milestone 1
- [x] Allow/deny policy behavior remains unchanged for read-only vs mutating tools — Milestone 1
- [x] Focused regression tests cover overridden and non-overridden cases — Milestone 1
- [x] `normalizeToolResult()` prefers `details.ptcValue` as the first-class machine-native result when present — Phase 2
- [x] Mocked hashline-style structured payload tests cover `read`, `grep`, and `edit` while preserving text fallback behavior — Phase 2
- [x] Nested RPC handling preserves structured `details.ptcValue` results unchanged across the tool boundary — Phase 2
- [x] Documented expected structured result shapes and fallback semantics for hashline-style `read` / `grep` / `edit` payloads — Phase 3
- [x] Added a lightweight combined interop smoke regression proving active hashline-style `read` / `grep` / `edit` override execution and `details.ptcValue` passthrough — Phase 4
- [x] Finalized milestone-facing interop docs with smoke-proof location and contract expectations — Phase 4
- [x] Python helper contracts, generated wrappers, and model-facing guidance now expose structured anchored result models for builtin `read` / `grep` / `edit` while preserving fallback-safe behavior — Phase 5
- [x] Extension tools now support explicit `ptc.callable` / `ptc.policy` metadata with legacy `enabled` / `readOnly` compatibility, aligned callable-tool policy behavior, and documented combined-stack setup guidance — Phase 6
- [x] Added a canonical end-to-end search → inspect → edit demo workflow plus aligned combined-stack documentation for `pi-ptc-next` + `pi-hashline-readmap` — Phase 7
- [x] Evaluated the heavier real two-extension loading harness and explicitly deferred it in favor of the lightweight smoke proof unless future packaging-level evidence justifies it — Phase 7
- [x] Prepared reviewer-facing PR 1 / PR 2 narratives and a deterministic manual submission checklist for the approved 2-PR upstream split — Phase 18
- [x] Restored a repo-local personal analysis launcher profile and made allowlisted-but-unavailable tool gaps explicit so personal `code_execution` sessions fail transparently instead of silently — Phase 19
- [x] Added repo-local personal-fork maintenance entrypoints and a normal maintainer runbook for routine verification plus manual sync/upgrade boundaries — Phase 20
- [x] Archived/demoted upstream PR-prep material behind a Milestone 7 archive guide so personal maintenance is the active workflow and the old submission path is historical reference only — Phase 21
- [x] Aligned package/project version markers to `0.8.0`, added explicit fork package metadata + MIT license coverage, and introduced repo-local `verify:release-package` tarball validation — Phase 22
- [x] Added a durable `CHANGELOG.md`, dedicated `0.8.0` release notes, and maintainer-doc links that describe the personal fork release baseline without overstating automation — Phase 23
- [x] Added a repo-owned `verify:ci` command, a verification-only GitHub Actions workflow, and aligned maintainer/release docs so the `0.8.0` release baseline now has repeatable local + CI verification without overstating publish/tag/git automation — Phase 24
- [x] Added an explicit response/file handle contract plus non-breaking adapter extraction for existing `pi-web-tools` `responseId` / `filePath` follow-up flows, backed by focused regression coverage — Phase 25
- [x] Added bounded Python handle helpers (`ptc.extract_handles`, `ptc.first_handle`), execution-level response/file follow-up proof, and README/model guidance while keeping graph handles out of scope — Phase 26
- [x] Added strict Python result-kind assertions via `ptc.expect_kind(value, kind)` with focused runtime proof while keeping broader validation/tool-introspection work out of scope — Phase 27
- [x] Added bounded Python callable-tool introspection via `ptc.list_callable_tools()` / `ptc.get_tool_schema(name)` backed by session-scoped wrapper metadata derived from the live callable runtime surface — Phase 28
- [x] Added execution-level proof plus README/tool-description guidance for `ptc.expect_kind(...)`, `ptc.list_callable_tools()`, and `ptc.get_tool_schema(name)`, including safe optional-tool branching based on the live callable session surface — Phase 29
- [x] Added bounded Python orchestration helpers `ptc.batch_tool(...)` / `ptc.first_success(...)` with shared call-spec validation and focused execution proof — Phase 30
- [x] Added bounded Python reduction and output-budget helpers `ptc.reduce_tool(...)` / `ptc.fit_output(...)` aligned to the session output cap, with focused execution proof — Phase 31
- [x] Added execution-level ecosystem proof plus README/tool-description guidance for `ptc.batch_tool(...)`, `ptc.first_success(...)`, `ptc.reduce_tool(...)`, and `ptc.fit_output(...)`, including compact hashline/codegraph/web composition examples — Phase 32
### Active (In Progress)
- None — Milestone 19 is complete; next milestone has not started.
### Validated (Shipped)
- [x] Restored the P0 file-discovery helper path by removing `glob(limit=...)` dependency and proving bounded success for `ptc.read_tree()`, `ptc.find_files()`, and `ptc.find_files_abs()` in live audit coverage — Phase 39
- [x] Improved syntax/compile-time error surfacing so pre-terminal Python failures now expose actionable `SyntaxError`/traceback context instead of generic RPC closure messaging — Phase 40
- [x] Added bounded `batch_tool` collect-mode partial envelope support (`kind: "batch_partial"`) with deterministic stress/orchestration proof and updated helper guidance/README contracts — Phase 41
- [x] Renamed the package publish surface to `pi-ptc-advanced` at `0.15.0`, aligned root lock metadata, and tightened release-package verification to assert the new package identity while intentionally deferring broader docs/history updates — Phase 42
- [x] Aligned README, changelog, maintainer docs, and a new `0.15.0` release note with the `pi-ptc-advanced` publish target while preserving explicit `pi-ptc-next` / upstream lineage and manual publish boundaries — Phase 43
- [x] Finalized the `0.15.0` publish-readiness gate by excluding packaged Python bytecode artifacts, proving clean installability from the packed tarball, and aligning maintainer/release guidance to the final bounded manual-publish model — Phase 44
- [x] Produced a Pi 0.74.0 compatibility delta audit (`.paul/phases/45-pi-api-and-documentation-delta-audit/45-01-PI-COMPAT-AUDIT.md`) covering installed-vs-latest evidence baseline, an 18-row extension API compatibility matrix, 6 prompt-integration findings, and a bounded Phase 46/47/48 remediation handoff with 6 explicit deferrals — Phase 45
- [x] Aligned runtime compatibility to latest Mario-scope Pi packages (`@mariozechner/*@0.73.1`), preserved Pi `sourceInfo` separately from PTC's internal `source` taxonomy, and added hashline bridge no-executor observability while preserving builtin fallback — Phase 46
- [x] Added Pi prompt metadata for `code_execution`, idempotent `systemPromptOptions`-aware fallback auto-routing, custom-tool prompt metadata preservation, and focused README/CHANGELOG guidance while preserving the Phase 46 Mario-scope compatibility decision — Phase 47
- [x] Finalized the `0.16.0` compatibility-proof release candidate: package metadata + lockfile + verify-release-package script aligned, new `test/release-readiness.test.ts` (7-test drift suite), new `docs/releases/0.16.0.md`, README/CHANGELOG/runbook repointed, and DEAN audit baseline (`4 critical / 0 high / 3 moderate / 0 low`, valid through 2026-06-11) acknowledged at human-verify checkpoint — Phase 48
- [x] Added completed `code_execution` source visibility through Pi's collapsed/expanded tool-result affordance, recorded the TUI primitive audit, clarified `nu` versus `code_execution` prompt guidance, and documented/verified the behavior with focused render and prompt tests — Phase 49
- [x] Added `ptc.report(...)` as an optional JSON-safe structured report shape with preserved `details.report` / `details.reportProduced`, compact/expanded completed-result rendering, and README/CHANGELOG guidance while keeping free-form and `ptc.fit_output(...)` returns unchanged — Phase 50
- [x] Added root-aware path formatting for Python file helpers plus `ptc.tabulate(...)` and shallow `ptc.diff(...)` bridge helpers while preserving historical defaults and keeping broad aggregation in `nu` — Phase 51
- [x] Added optional callable-tool prompt metadata propagation into Python plus `ptc.help(tool_name)` for bounded on-demand helper guidance while preserving schema-only `ptc.get_tool_schema(...)` behavior — Phase 52
- [x] Added `ptc.run_tests(pattern)` as a first-class Node `node --test` helper that returns a Phase 50 `ptc_report` with pass/fail/duration metrics, a bounded failures table, runner-availability data, a fixed 120s timeout, and reentry-safe subprocess execution, plus README/CHANGELOG/generated-guidance coverage — Phase 53
- [x] Hardened `ptc.run_tests(pattern)` runner availability reporting with scalar `runner_path` / `runner_resolution` metadata, shell-quoted command display for patterns containing spaces, active-runtime Node/PATH guidance, and README edit-payload contract alignment — Phase 54
- [x] Normalized callable wrapper guidance and grep positional shorthand: direct callable Pi wrappers are explicitly awaitable, `grep("pattern", path="...")` is supported, and Phase 56 result/error semantics remain separately scoped — Phase 55
- [x] Tightened result normalization and partial-error semantics: direct/batched read/grep paths now share workspace-relative path normalization; `ptc.read_many(..., on_error='collect')` returns a typed partial envelope; and `ptc.batch_tool(..., on_error='collect')` classifies normalized tool-level failures while preserving raw payloads — Phase 56
- [x] Closed Milestone 19 release readiness: remaining live-audit helper edge cases are covered by issue-numbered regressions, `ptc.list_helpers()` exposes the curated helper inventory, all issue-note items carry explicit status, and the `0.18.0` release baseline is prepared with improved audit posture (`0 critical / 0 high / 3 moderate / 0 low`) — Phase 57
- [x] Full live audit: 51 tests across 3 phases proving 94% of helpers work, with stress testing (concurrency, large files, output budgets) and 7 multi-tool composition workflows all passing. 1 P0 bug found (glob/limit), 2 P1, 2 P2 issues documented — Milestone 14
- [x] Systematic live-tool audit of all 21 Python helpers and 8 pipeline capabilities — Phase 36
- [x] Added user-facing recipe workflow documentation and ecosystem composition proof — Phase 35
- [x] Added concrete cross-repo recipe artifacts plus deterministic benchmark baseline — Phase 34
### Planned (Next)
- Next milestone / manual release decision TBD after PR #14 merge.
### Out of Scope
- [ ] Long-term IR refactors during the early interop milestones
- [ ] Broad helper ergonomics changes beyond what is required for trustworthy structured interop

## Target Users
**Primary:** Pi extension authors and advanced Pi users building Python-assisted tool workflows
- Need `code_execution` to behave consistently with the active tools visible in chat
- Need reliable anchored file-inspection and edit workflows
- Need minimal divergence between normal Pi execution and PTC execution paths

**Secondary:** Maintainers integrating `pi-ptc-next` with `pi-hashline-readmap`
- Need a small, reviewable runtime seam before structured payload work
- Need lightweight, trustworthy proof before broader together-testing and documentation work

## Context
**Business Context:**
This work improves trustworthiness and interoperability across Pi extensions by making `pi-ptc-next` honor the same active tool implementations users already rely on in chat.

**Technical Context:**
- Existing codebase detected: TypeScript npm package / Pi extension with Python runtime support
- Package name: `pi-ptc-advanced`
- Key source areas: `src/index.ts`, `src/code-executor.ts`, `src/custom-tool-manager.ts`, `src/tool-registry.ts`, `src/tool-adapters.ts`, `src/rpc-protocol.ts`
- Maintainer-facing integration docs now live in `README.md`; deeper local planning/history artifacts live under `.paul/`
- Latest GitHub Flow evidence: Phase 57 PR #14 merged to `main` at squash commit `3a1ffbf`; GitHub Actions `Verify release baseline` and Socket checks passed before merge.

## Constraints
### Technical Constraints
- Must preserve existing `code_execution` behavior for tools without overrides
- Must use the same active Pi tool implementations users see in chat for overridden names
- Must not introduce accidental recursion into `code_execution`
- Must keep safety and determinism intact for anchored hashline workflows
- Existing TypeScript, Node, and Python runtime architecture should be preserved

### Business Constraints
- Changes should be narrowly scoped and reviewable
- Upstream-friendly patches are preferred over a long-lived fork

### Compliance Constraints
- No additional compliance constraints identified yet

## Key Decisions
| Decision | Rationale | Date | Status |
|----------|-----------|------|--------|
| Start with the runtime seam for active tool execution | It removes split-brain behavior and makes later interop work trustworthy | 2026-03-16 | Active |
| Keep milestone 1 focused on correctness and tests | Small scoped patches reduce risk in a brownfield codebase | 2026-03-16 | Active |
| Preserve fallback builtin behavior and policy handling | Interop improvements should not regress existing safety or compatibility | 2026-03-16 | Active |
| Keep the seam in the registry/tool-resolution layer | Minimizes risk and avoids unnecessary runtime churn | 2026-03-16 | Active |
| Make `ptcValue` preference explicit in the normalization layer before broader interop work | The runtime contract should be locked down with small, testable changes before adding docs or together-testing | 2026-03-16 | Active |
| Prefer mocked hashline-style payload tests before a real two-extension smoke harness | Lightweight proof keeps the current phase narrow and sets up Phase 4 for a focused real-world check | 2026-03-16 | Active |
| Clarify in model-facing `code_execution` guidance that builtin helper signatures are fallback defaults and active overrides may return richer `details.ptcValue` payloads | Prevents users/models from assuming fallback signatures cap structured interop behavior | 2026-03-17 | Active |
| Keep Phase 4 closure lightweight: prove active override + `ptcValue` flow with focused smoke coverage and document exact verification steps | Delivers together-confidence without introducing heavy harness complexity or milestone scope creep | 2026-03-17 | Active |
| Model builtin helper ergonomics with explicit structured anchored result types instead of only generic fallback signatures | Makes Python-side hashline interop easier to understand and use without changing runtime behavior | 2026-03-17 | Active |
| Prefer explicit `ptc.callable` / `ptc.policy` metadata for extension tools while normalizing legacy `enabled` / `readOnly` metadata | Clarifies callable intent and safety traits without breaking existing extension tools or operator workflows | 2026-03-17 | Active |
| Close Milestone 3 with focused docs/demo artifacts and an explicit harness recommendation instead of automatically building heavier integration infrastructure | Keeps the final milestone slice reviewable and grounded in demonstrated runtime behavior while preserving a clear future trigger for deeper harnessing | 2026-03-17 | Active |
| Prefer a 2-PR upstream packaging strategy for the current PTC interop work | Runtime interop and metadata/helper/docs are both upstream-worthy, but they review more cleanly as separate slices with clearer narratives | 2026-03-24 | Active |
| Build upstream review branches from `origin/main` with explicit file restores instead of relying on mixed-branch cherry-picks | The current feature branch mixes upstream-worthy code, local-only PALS history, and optional harness/docs; explicit restore-based branch construction gives clean PR slices | 2026-03-24 | Active |
| Acceptance hardening should align reviewer-facing docs and generated wrapper types to the live structured payloads while reusing the smallest focused proof set that already covers the claims | Keeps upstream acceptance work narrow, defensible, and grounded in the existing retained verification surface instead of adding broader harness churn | 2026-03-24 | Active |
| Keep upstream submission execution manual and restore-based even after the PR materials are prepared | The working branch still mixes local-only history with upstream-worthy code, so clean review branches and user-directed PR opening remain the safest path | 2026-03-24 | Active |
| Shift from upstream submission prep to personal fork maintainability as the primary delivery goal | The upstream project is no longer expected to move quickly, while the fork already works and will be maintained for personal use | 2026-03-24 | Active |
| Treat `PTC_CALLABLE_TOOLS` as a filter over Pi-visible tools, not as a loader for missing tools | The personal analysis profile must be deterministic and honest about runtime visibility limits instead of implying the allowlist alone should materialize unavailable tools | 2026-03-24 | Active |
| Keep personal fork maintenance automation repo-local and verification-focused while leaving git sync/upgrade actions manual | The fork needs repeatable local verification and operator guidance, but remote/branch/rebase/push/PR actions still depend on user-specific remotes and history choices | 2026-03-24 | Active |
| Archive the old upstream PR-prep material behind a single milestone-level guide instead of deleting it outright | Preserves the historical upstream rationale while making the personal maintenance workflow unambiguous for future sessions | 2026-03-24 | Active |
| Keep Milestone 10 Phase 25 scoped to explicit response/file handles and expose them through separate extraction helpers instead of changing normalized tool values | Existing `pi-web-tools` response/file follow-up shapes are stable enough to adopt now, while preserving current `normalizeToolResult()` passthrough/fallback behavior avoids a breaking contract change for current consumers | 2026-03-25 | Active |
| Keep Milestone 10 Phase 26 helper ergonomics bounded to `ptc.extract_handles()` / `ptc.first_handle()` over the existing response/file handle contract | A small helper surface makes supported follow-up flows practical in Python without changing normalized tool values or implying unsupported graph handles | 2026-03-25 | Active |
| Keep Milestone 11 Phase 27 scoped to top-level result-kind assertions via `ptc.expect_kind(value, kind)` | Models need an explicit kind assertion primitive now, while broader schema validation and tool introspection should remain separate to avoid helper-framework creep | 2026-03-26 | Active |
| Keep Milestone 11 Phase 28 introspection metadata derived from the live wrapper-generation `ToolInfo[]` surface instead of adding a second registry | Python-side introspection must reflect the actual callable session surface, including aliases, without exposing runtime executors or risking metadata drift | 2026-03-26 | Active |
| Treat `ptc.list_callable_tools()` as the authoritative optional-tool branching surface in docs/examples | Optional helper availability depends on the live callable session surface, not configuration intent alone | 2026-03-26 | Active |
| Keep Phase 30 orchestration call specs bounded to `{tool, params}` and validate them in `runtime.py` | A compact shared call-spec contract keeps the first orchestration slice generic and bounded without introducing a broader DSL | 2026-03-26 | Active |
| Keep `ptc.first_success(...)` sequential and ordered in Phase 30 while validating `max_concurrency` only for interface consistency | Deterministic fallback behavior is easier to reason about and test than concurrent racing/cancellation in the initial orchestration helper slice | 2026-03-26 | Active |
| Keep `ptc.fit_output(...)` aligned with the executor session output cap by default | Output-fitting defaults should match the real executor output boundary so Python-side compaction stays trustworthy and does not imply a larger safe budget than the session actually has | 2026-03-26 | Active |
| Prefer structured preview metadata over immediate opaque string compaction in `ptc.fit_output(...)` | Bounded previews are more useful when they preserve JSON-safe shape and truncation metadata, even though that adds some runtime-local complexity | 2026-03-26 | Active |
| Close Milestone 12 with focused ecosystem proof and guidance instead of reopening runtime semantics | Phases 30-31 already shipped the helper behavior; the remaining gap was trustworthy proof and user-facing guidance aligned to the existing surface. | 2026-03-26 | Active |
| Keep Phase 33 scoped to additive eval/benchmark recipe-target contracts and deterministic seeded cases | The first M4 slice needed stable machine-readable recipe targets and bounded output expectations without expanding runtime semantics or docs scope prematurely | 2026-03-26 | Active |
| Convert the new recipe-contract test files to import-based syntax and `process.cwd()` path resolution instead of changing package module mode | The phase surfaced local diagnostics in touched test files, and the smallest fix was file-local syntax/path cleanup rather than a package-wide module-policy change | 2026-03-26 | Active |
| Keep Phase 39 file-discovery remediation bounded to helper-side `max_files` slicing + payload normalization instead of broad runtime refactors | Fixes the audit P0 root cause while preserving runtime surface stability and avoiding hotspot churn in `runtime.py` | 2026-03-27 | Active |
| Keep Milestone 17 Phase 45 strictly audit-only, treating the installed Pi `0.74.0` package as the executable latest baseline because it equals the latest npm dist-tag | Bounds the research scope, avoids speculative remediation, and produces evidence-linked Phase 46/47/48 handoffs before any runtime or prompt-guidance changes | 2026-05-11 | Active |
| Defer the CI "Verify release baseline" `ERR_UNKNOWN_FILE_EXTENSION` failure to Phase 48 or a `/paul:fix` loop instead of bundling it into Phase 45 | The Actions runner Node 20.20.2 issue is pre-existing, unrelated to the audit-only artifact, and out of Phase 45's scope; the audit must not become a CI/runner fix | 2026-05-11 | Active |
| Target latest Mario-scope Pi packages for Phase 46 instead of hard-switching to `@earendil-works/*` | The user is still on the Mario package scope; latest-Mario alignment removes the older 0.55.1 drift without breaking local installs | 2026-05-11 | Active |
| Keep Pi `sourceInfo` separate from PTC's internal `source` taxonomy | Python helper metadata depends on stable `source: builtin | alias | extension`; preserving host provenance separately avoids a backwards-incompatible metadata change | 2026-05-11 | Active |
| Surface `code_execution` through Pi prompt metadata while keeping auto-route fallback idempotent | Native `promptSnippet` / `promptGuidelines` make the tool visible in Pi's default prompt, while fallback injection remains conservative and skips duplicate guidance when `systemPromptOptions` already selected equivalent code_execution routing | 2026-05-11 | Active |
| Ship `0.16.0` as a release candidate with an explicitly acknowledged dependency-audit baseline rather than blocking on advisory remediation | The Milestone 17 scope was compatibility proof and release readiness, not advisory remediation; documenting the DEAN baseline with a tracked expiry inside `.paul/dean-baseline.json`, the changelog, and the release note preserves honesty about audit posture while letting the milestone close on its actual scope | 2026-05-12 | Active |
| Use a focused 7-test release-readiness drift suite (`test/release-readiness.test.ts`) as the durable guard for version/doc/script alignment | A single file-local test pattern across package.json, lockfile, verify-script, release note, README, CHANGELOG, and runbook is cheap to maintain (only constants change per release) and prevents the recurring 0.x → 0.x doc-drift class of bug | 2026-05-12 | Active |
| Preserve completed `code_execution` source with expanded tool details while keeping default output compact | Users need post-run debugging access to executed Python without forcing long code blocks into the default completed tool row | 2026-05-12 | Active |
| Format the Phase 49 expansion hint via Pi TUI keybindings and active render theme instead of direct `keyHint` import | This preserves keybinding-aware behavior while avoiding a CommonJS/ESM runtime incompatibility in the current package shape | 2026-05-12 | Active |
| Keep `ptc.report(...)` optional and attach structured metadata through `details.report` rather than making every code_execution return schema-bound | Stronger report/eval contracts are useful, but existing free-form returns and `ptc.fit_output(...)` must remain compatible | 2026-05-12 | Active |
| Extract report rendering/shape helpers into `src/report.ts` instead of growing `src/index.ts` | The extension entrypoint is a known hotspot; report formatting should stay testable and reusable for future output-shape phases | 2026-05-12 | Active |
| Keep `ptc.diff(...)` shallow-only for Phase 51 | The helper should remain a slim bridge for explicit before/after values, not a recursive diff engine; nested structures can be reported as whole-value changes unless future demand justifies `recursive=True` | 2026-05-12 | Active |
| Make `ptc.tabulate(...)` return the exact Phase 50 report table payload | Direct `ptc.report(tables=[ptc.tabulate(...)])` composition avoids a near-compatible variant and keeps output-shape contracts simple | 2026-05-12 | Active |
| Keep broad aggregators (`top_n`, `group_by`, `histogram`) out of PTC helper scope | `nu` is the intended native path for grouping, histograms, ranking, and pipeline-style data analysis; PTC should add only small bridge helpers here | 2026-05-12 | Active |
| Keep `ptc.help(...)` as the richer callable metadata helper while preserving schema-only `ptc.get_tool_schema(...)` | Agents need one targeted lookup for optional-tool purpose, prompt metadata, and call parameters, but existing schema callers must remain compatible and prompt guidance must avoid static inventory bloat | 2026-05-12 | Active |
| Scope `ptc.run_tests(pattern)` to Node `node --test` only for Phase 53 | A focused single-runner helper meets the Milestone 18 ergonomics goal without expanding the helper surface or adding dependencies; cross-runner support can grow as new helpers (e.g., `ptc.run_pytest`) later | 2026-05-12 | Active |
| Treat missing `node` and timeouts as report data (`runner_available=false` / `timed_out=true`) instead of Python errors | Agents calling the helper inside Docker / minimal sandboxes should still get a structured answer; only invalid arguments raise `ValueError`, matching the Phase 50 reporting style | 2026-05-12 | Active |
| Scrub `NODE_TEST_CONTEXT` / `NODE_RUN_SCRIPT_NAME` from the helper's child env | External-process helpers must drop the parent's reentry markers so calling `ptc.run_tests` from inside a Node test run does not trigger "node:test run() is being called recursively" and miscount totals as zero | 2026-05-12 | Active |
| Keep `ptc.run_tests` Node-only while making runner availability explicit | Phase 54 adds scalar runner resolution metadata and quoted command display without widening into package-script or cross-runner support | 2026-05-13 | Active |
| Keep README live payload examples aligned to normalized hashline payloads | CI caught drift in the edit example's `diffData`; README examples must include the same structured shape asserted by contract tests | 2026-05-13 | Active |
| Keep callable Pi wrappers explicitly awaitable while supporting obvious positional shorthand only at bounded adapter seams | Direct wrappers are async RPC calls; the grep runtime adapter already owns live grep normalization, so supporting `grep("pattern", path="...")` there avoids broader wrapper-generator churn and preserves Phase 56 result/error semantics for a separate pass | 2026-05-13 | Active |
| Ship `ptc.list_helpers()` as the curated helper inventory, separate from `ptc.list_callable_tools()` | Models need a deterministic way to distinguish built-in `ptc.*` helper functions from live callable Pi tools; a literal inventory avoids reflection drift and keeps optional-tool branching clear | 2026-05-13 | Active |
| Keep `details.ptcValue` guidance in README rather than generated `code_execution` prompt text | The generated description intentionally stays concise and preserves existing prompt-description invariants, while README remains the durable contract for this advanced boundary case | 2026-05-13 | Active |

## Success Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Overridden `read`/`grep`/`edit` execute via active Pi tool implementations inside `code_execution` | Yes | Yes | Achieved |
| Builtin fallback works when no override is present | Yes | Yes | Achieved |
| Focused tests for override and fallback paths | Added and passing | Added and passing | Achieved |
| Structured `ptcValue` normalization and RPC passthrough for hashline-native tools | Yes | Normalization + mocked proof + docs/model-guidance reconciliation landed | Achieved |
| Lightweight interop smoke proof for active hashline-style overrides and `ptcValue` passthrough | Yes | Added in `test/hashline-interop-smoke.test.ts` and documented in README/hashline docs | Achieved |
| Python helper ergonomics for structured anchored builtin results | Yes | Builtin contracts, wrappers, and `code_execution` guidance now expose richer anchored result models | Achieved |
| Explicit metadata/policy contract for extension tools | Yes | `ptc.callable` / `ptc.policy` normalization, legacy compatibility, policy tests, and combined-stack guidance landed | Achieved |
| Full real two-extension loading smoke harness with `pi-hashline-readmap` | Optional | Explicitly evaluated and deferred; lightweight smoke coverage remains the first-pass upstream verification point | Deferred |
| Repo-owned CI verification path for the current publish baseline | Yes | `npm run verify:ci` remains available while package metadata and release-package verification now target `pi-ptc-advanced@0.18.0` | Achieved |
| Execution-level proof and user-facing docs for Milestone 11 helper ergonomics | Yes | Dedicated runtime proof, tool-description assertions, README updates, and doc-contract coverage landed in Phase 29 | Achieved |
| Bounded reduction and output-budget helpers for Python orchestration flows | Yes | `ptc.reduce_tool(...)` and `ptc.fit_output(...)` landed with focused execution proof and executor-aligned output-budget defaults | Achieved |
| Ecosystem-style proof and user-facing docs for Milestone 12 orchestration/output-budget helpers | Yes | Dedicated runtime proof, README examples, tool-description guidance, and doc-contract coverage landed in Phase 32 | Achieved |
| Structured report shape for code_execution outputs | Yes | `ptc.report(...)`, `details.report` / `details.reportProduced`, compact/expanded rendering, and docs landed in Phase 50 | Achieved |
| Path ergonomics and bridge helpers for Python analysis flows | Yes | `relative` / `relative_to` path formatting, `ptc.tabulate(...)`, shallow `ptc.diff(...)`, focused tests, README/tool guidance, and CHANGELOG landed in Phase 51 | Achieved |
| Callable-tool prompt metadata and on-demand help | Yes | Optional `promptSnippet` / `promptGuidelines` propagation plus `ptc.help(tool_name)` landed with runtime, docs, generated-guidance, and contract-test proof in Phase 52 | Achieved |
| Bounded Node test runner verb for Python flows | Yes | `ptc.run_tests(pattern)` returns a Phase 50 `ptc_report` with pass/fail/duration metrics, a bounded failures table, runner-availability data, fixed 120s timeout, and reentry-safe subprocess execution; landed with runtime, docs, generated-guidance, and live tests in Phase 53 | Achieved |
| Live-audit helper edge cases closed for Milestone 19 | Yes | Issue-numbered regressions cover remaining live-audit items; `ptc.list_helpers()` documents the curated helper surface; release notes and issue status reconcile all 10 items | Achieved |
| Deterministic recipe-target contract and seeded M4 workflow corpus | Yes | Additive `recipe_target` metadata, benchmark-result passthrough, and four deterministic recipe cases landed in Phase 33 | Achieved |

## Tech Stack
| Layer | Technology | Notes |
|-------|------------|-------|
| Framework | `@mariozechner/pi-coding-agent` extension API | Pi extension entrypoint in `src/index.ts` |
| Runtime | Node.js + TypeScript | Built with `tsc` |
| Python Execution | Bundled Python runtime assets | Used by `code_execution` |
| UI | `@mariozechner/pi-tui` | Tool rendering components |
| Schema | `@sinclair/typebox` | Tool parameter schemas |

## Links
| Resource | URL |
|----------|-----|
| Repository | https://github.com/coctostan/pi-ptc-next |
| Maintainer Docs | `README.md` |
| Local Roadmap | `.paul/ROADMAP.md` |
| Milestone History | `.paul/MILESTONES.md` |

---
*PROJECT.md — Updated when requirements or context change*
*Last updated: 2026-05-13 after Phase 57 UNIFY and Milestone 19 completion*
