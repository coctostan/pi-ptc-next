# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| Milestone 1 — Active Tool Runtime Seam | 2026-03-16 | ~18 minutes | 1 phase, 1 plan |
| Milestone 2 — Structured Results Contract | 2026-03-17 | ~6 hours | 3 phases, 3 plans |
| Milestone 3 — Python Ergonomics and Metadata | 2026-03-17 | ~1.5 hours | 3 phases, 3 plans |
| Milestone 4 — Cross-Extension Tool Execution Bridge | 2026-03-18 | ~1 hour | 3 phases, 3 plans |
| Milestone 5 — Python Helper Normalization | 2026-03-18 | ~15 minutes | 2 phases, 2 plans |
| Milestone 6 — Review Findings Remediation | 2026-03-19 | ~20 minutes | 2 phases, 2 plans |
| Milestone 7 — Upstream PR Preparation | 2026-03-24 | ~2 hours | 4 phases, 4 plans |
| Milestone 8 — Personal Fork Hardening | 2026-03-24 | multi-session | 3 phases, 3 plans |
| Milestone 10 — Typed Response and File Handle Helpers | 2026-03-25 | approximately 2 hours 20 minutes | 2 phases, 2 plans |
| Milestone 11 — Result-Kind and Tool Introspection Helpers | 2026-03-26 | approximately 1 hour 20 minutes | 3 phases, 3 plans |
| Milestone 12 — High-Level Orchestration Helpers | 2026-03-26 | approximately 2 hours | 3 phases, 3 plans |
| Milestone 13 — Ecosystem Examples and Recipes | 2026-03-26 | ~2 hours | 3 phases, 3 plans |
| Milestone 14 — Live Tool Audit and Stress Testing | 2026-03-26 | ~1.5 hours | 3 phases, 3 plans |

---

## ✅ Milestone 14 — Live Tool Audit and Stress Testing (0.13.0)

**Completed:** 2026-03-26
**Duration:** ~1.5 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Tests added | 51 |
| Files changed | 6 |

### Key Accomplishments

- Systematic live-tool audit of all 21 Python helpers with real tool calls — 18 working, 3 broken (shared glob/limit bug)
- Pipeline audit of 8 capabilities: RPC bridge, ptcValue passthrough, error handling — 6 working, 2 partial
- Stress testing under concurrency (10+ parallel), large files (1000 lines), output budget pressure, and error chains — all pass
- 7 multi-tool composition workflows proving helpers chain correctly end-to-end
- Final consolidated audit report with per-capability ratings, gap analysis, and remediation priorities

### Key Decisions

- Document bugs as assert.rejects tests rather than skipping — keeps audit honest and repeatable
- batch_tool fail-fast behavior documented as design choice, not bug — models should use try/except
- Audit is observation-only: no runtime source fixes during the milestone

---

## ✅ Milestone 13 — Ecosystem Examples and Recipes (0.12.0)

**Completed:** 2026-03-26
**Duration:** ~2 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 15 |

### Key Accomplishments

- Added additive `recipe_target` metadata to the seeded eval/benchmark surface with four deterministic recipe cases covering graph, web, hashline, and mixed workflows
- Shipped concrete recipe artifacts (`.pi/evals/ptc/recipes/*.py`) that compose bounded PTC helpers into real multi-tool analysis patterns without domain-specific imports
- Created a deterministic recipe-only benchmark baseline fixture for regression-free recipe corpus validation
- Added user-facing recipe workflow documentation to README.md with a 4-workflow reference table, CLI invocation guide, and extension instructions
- Added focused ecosystem composition proof (13 tests) validating that all four workflow types compose through PTC helpers cleanly

### Key Decisions

- Use `ptc.fit_output(...)` as the final bounded return step in every recipe so large intermediate tool results stay local to Python
- Keep recipe artifacts provider-agnostic and deterministic via seeded case metadata and static benchmark fixtures rather than live network/repo integration
- Treat the recipe-suite baseline as a metadata-aligned fixture under the existing benchmark contract, not a new runner mode
- Keep recipe documentation inside the existing evals section as a subsection to avoid README section proliferation
- Match ecosystem proof to recipe filenames by stem rather than abstract workflow labels for stable test-to-artifact alignment

---
## ✅ Milestone 12 — High-Level Orchestration Helpers (0.11.0)

**Completed:** 2026-03-26
**Duration:** approximately 2 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 9 |

### Key Accomplishments
- Added bounded Python orchestration helpers `ptc.batch_tool(...)` and `ptc.first_success(...)` with shared call-spec validation and focused execution proof.
- Added bounded Python reduction and output-budget helpers `ptc.reduce_tool(...)` and `ptc.fit_output(...)` aligned to the executor session output cap.
- Closed the milestone with dedicated ecosystem-style `CodeExecutor` proof plus README and `code_execution` guidance for hashline-style reduction, ordered fallback, and web-handle follow-up workflows.
- Finished milestone verification green at `132` passing / `0` failing while keeping the existing dependency audit baseline unchanged.

### Key Decisions
- Keep orchestration call specs bounded to `{tool, params}` and validate them inside the Python runtime.
- Keep `ptc.first_success(...)` sequential and ordered for deterministic fallback semantics.
- Keep `ptc.fit_output(...)` aligned with the executor session output cap and preserve structured preview metadata.
- Close Milestone 12 with proof/docs alignment instead of reopening runtime semantics during the final phase.

---
## ✅ Milestone 11 — Result-Kind and Tool Introspection Helpers (0.10.0)

**Completed:** 2026-03-26
**Duration:** approximately 1 hour 20 minutes

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 11 |

### Key Accomplishments
- Added strict Python result-kind assertions via `ptc.expect_kind(value, kind)` with focused runtime proof.
- Added bounded callable-tool introspection via `ptc.list_callable_tools()` and `ptc.get_tool_schema(name)` using metadata derived from the live wrapper-generation surface.
- Added dedicated contract and execution-level proof for the new helpers without expanding the large omnibus runtime suites.
- Updated `README.md` and the `code_execution` tool description so safe optional-tool branching now checks `ptc.list_callable_tools()` before calling helpers like `sg`.
- Closed the milestone with verification green at `119` passing / `0` failing while keeping the existing audit baseline unchanged.

### Key Decisions
- Keep `ptc.expect_kind(...)` limited to top-level `kind` assertions instead of broad schema validation.
- Derive callable-tool introspection metadata from the live `ToolInfo[]` wrapper-generation path instead of adding a second registry.
- Treat `ptc.list_callable_tools()` as the authoritative optional-tool branching surface in docs and examples.
- Keep Milestone 11 as a capability/docs slice without changing the manual `0.8.0` release baseline or git-tag posture.

---
## ✅ Milestone 10 — Typed Response and File Handle Helpers (0.9.0)

**Completed:** 2026-03-25
**Duration:** approximately 2 hours 20 minutes

### Stats

| Metric | Value |
|--------|-------|
| Phases | 2 |
| Plans | 2 |
| Files changed | 13 |

### Key Accomplishments
- Added an explicit response/file handle contract around existing `responseId` / `filePath` flows without changing normalized tool result shapes.
- Added bounded Python helper ergonomics via `ptc.extract_handles()` and `ptc.first_handle()` plus generated `ResponseHandle` / `FileHandle` / `SupportedHandle` typing coverage.
- Proved supported response/file follow-up workflows end-to-end inside the real `code_execution` runtime using deterministic nested-tool fixtures.
- Updated `README.md` and the model-facing `code_execution` guidance so the supported response/file-only workflow is explicit.
- Closed the milestone with green verification at `112` passing / `0` failing while keeping graph-handle ergonomics intentionally deferred.

### Key Decisions
- Support only response and file handles for the current contract surface; defer graph-handle standardization until adjacent repos expose a stable public contract.
- Keep handle extraction separate from normalized result values so existing `normalizeToolResult()` passthrough/fallback consumers remain unchanged.
- Expose exactly two bounded Python helpers: `ptc.extract_handles()` and `ptc.first_handle()`.
- Keep helper filtering limited to `kind="response"` / `kind="file"`.
- Keep the published release baseline at `0.8.0`; Milestone 10 completed as a capability/documentation slice without changing the manual release/tag posture.

---

## ✅ Milestone 8 — Personal Fork Hardening (0.7.0)

**Completed:** 2026-03-24
**Duration:** multi-session

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 15 |

### Key Accomplishments
- Restored a deterministic repo-local personal analysis profile and made allowlisted-but-unavailable tool gaps explicit instead of silently misleading `code_execution` users.
- Added repo-local maintenance entrypoints plus a normal maintainer runbook for routine verification and manual sync/upgrade boundaries.
- Demoted Milestone 7 upstream PR-prep artifacts behind a dedicated archive guide so personal maintenance is now the active operational path.
- Revalidated the personal maintenance path with focused and full verification during Phase 21 closure.

### Key Decisions
- Personal fork ownership is now the primary path; upstream submission material remains historical reference only.
- Keep `PTC_CALLABLE_TOOLS` as a filter over Pi-visible tools, not as a loader for missing tools.
- Keep local maintenance automation repo-local and verification-focused while leaving git sync/upgrade actions manual.
- Preserve upstream PR-prep context through a milestone-level archive guide instead of deleting it outright.

---
## ✅ Milestone 7 — Upstream PR Preparation (0.6.0)

**Completed:** 2026-03-24
**Duration:** approximately 2 hours
**Archive guide:** `.paul/milestones/0.6.0-UPSTREAM-PR-ARTIFACTS.md`

This milestone is preserved as historical reference only. The active operating path for this fork is the personal maintenance workflow documented in `README.md` and `docs/personal-fork-maintenance.md`.

### Stats

| Metric | Value |
|--------|-------|
| Phases | 4 |
| Plans | 4 |
| Files changed | 9 |

### Key Accomplishments
- Locked the upstream keep/exclude boundary and formalized a preferred 2-PR submission strategy for the mixed feature branch.
- Turned the scope audit into a restore-based branch-isolation manifest and removed local-only review baggage from the active PR surface.
- Reworked `README.md` so the combined-stack maintainer story stands on its own without local-only companion docs.
- Aligned the live structured `edit` contract across docs, generated Python wrapper typings, and focused contract tests.
- Revalidated the retained upstream evidence surface with green focused tests plus a green full suite.
- Produced reviewer-ready local PR 1 / PR 2 narratives and a deterministic manual submission checklist for upstream opening.

### Key Decisions
- Prefer a 2-PR upstream split: runtime interop first, metadata/helper/docs second.
- Build review branches from `origin/main` with explicit file restores instead of cherry-picking from the mixed working branch.
- Keep personal launcher scripts, `.paul/**` artifacts, repo-specific shims, and heavier harness material out of the first upstream submission pass.
- Reuse the smallest focused proof surface that already substantiates reviewer-facing docs instead of adding broader harness churn.
- Keep review-branch creation, upstream PR opening, version bumping, and release tagging user-directed until the Release and Packaging milestone.

---

## ✅ Milestone 1 — Active Tool Runtime Seam

**Completed:** 2026-03-16
**Duration:** approximately 18 minutes

### Stats

| Metric | Value |
|--------|-------|
| Phases | 1 |
| Plans | 1 |
| Files changed | 4 |

### Key Accomplishments
- `code_execution` now prefers the active Pi executor for same-name overridden builtins when that override is active.
- Builtin fallback behavior remains intact when no active override is present.
- Focused regression tests now cover active override execution for `read`, `grep`, and `edit`.
- Nested callable tool resolution still excludes `code_execution` and preserves current policy behavior.
- Milestone documentation now captures the runtime seam explicitly.

### Key Decisions
- Keep the runtime seam in the registry/tool-resolution layer instead of broadening changes into Python runtime files.
- Prefer active Pi executors only when the same-name override is actually active.
- Preserve builtin fallback behavior and current allow/block policy handling.
- Reuse existing `test/code-executor.test.ts` execution-path coverage instead of expanding end-to-end tests unnecessarily.

---

## ✅ Milestone 2 — Structured Results Contract

**Completed:** 2026-03-17
**Duration:** approximately 6 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 8 |

### Key Accomplishments
- `normalizeToolResult()` now explicitly prefers `details.ptcValue` as the first-class machine-native result when present.
- Mocked hashline-style structured payload tests cover `read`, `grep`, and `edit` with fallback behavior preserved.
- Nested RPC handling preserves structured `details.ptcValue` results unchanged across the tool boundary.
- Model-facing `code_execution` guidance documents `ptcValue` passthrough and richer active override payloads.
- Lightweight combined interop smoke proof (`test/hashline-interop-smoke.test.ts`) exercises active override execution + structured value flow in one RPC path.
- Final interop docs closure in `README.md`, `docs/hashline-integration/START-HERE.md`, and `docs/hashline-integration/ROADMAP.md`.

### Key Decisions
- Make `ptcValue` preference explicit in the normalization layer before broader interop work.
- Prefer mocked hashline-style payload tests before a real two-extension smoke harness.
- Keep Phase 4 closure lightweight: prove active override + `ptcValue` flow with focused smoke coverage.
- Git commit/branch automation remains user-directed due to remote ownership constraints.

---

## ✅ Milestone 3 — Python Ergonomics and Metadata (0.2.0)

**Completed:** 2026-03-17
**Duration:** approximately 1.5 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 15 |

### Key Accomplishments
- Python helper contracts now expose structured anchored result models (`ReadResult`, `GrepResult`, `AnchoredEditResult`, `SgResult`) for builtin `read` / `grep` / `edit` / `sg` with fallback-safe unions preserved.
- Generated tool wrappers emit richer TypedDict types so Python code can naturally consume hashline-native structured data.
- Extension tools now support explicit `ptc.callable` / `ptc.policy` metadata with full backward compatibility for legacy `ptc.enabled` / `ptc.readOnly`.
- Operator-level policy filters (`PTC_CALLABLE_TOOLS`, `PTC_BLOCKED_TOOLS`, `PTC_TRUSTED_READ_ONLY_TOOLS`) layer on top of metadata cleanly.
- Canonical combined-stack demo (`docs/hashline-integration/DEMO.md`) provides the authoritative search → inspect → edit walkthrough.
- Harness evaluation documented: lightweight smoke proof remains the recommended verification artifact pending packaging-level evidence for heavier infra.
- All 58 tests passing across the full suite.

### Key Decisions
- Prefer explicit `ptc.callable` / `ptc.policy` in docs and new tools while normalizing legacy metadata for backward compatibility.
- Keep the canonical demo separate from README to avoid duplication.
- Treat the lightweight smoke proof as the default verification artifact unless packaging-level problems surface.
- Close Milestone 3 with documentation-only final phase (no runtime changes needed).

---

## ✅ Milestone 4 — Cross-Extension Tool Execution Bridge (0.3.0)

**Completed:** 2026-03-18
**Duration:** approximately 1 hour

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 5 (1 source + 4 test stubs) |
| Lines added | ~35 source + ~80 test |

### Key Accomplishments
- Implemented EventBus bridge: hashline emits tool executors on `"hashline:tool-executors"` channel, PTC subscribes and overlays them onto builtins in `buildToolMap()`.
- `globalThis.__hashlineToolExecutors` dual-path handles load-order (hashline fires before PTC subscribes).
- `read()` inside `code_execution` now returns structured `ReadResult` dicts with `line`, `hash`, `anchor`, `raw`, `display` fields.
- `grep()` inside `code_execution` now returns structured `GrepResult` dicts with `totalMatches`, `records` containing anchor fields.
- Split-brain tool behavior eliminated: nested PTC tool calls use the same hashline implementations the agent uses directly.
- Bridge is explicitly temporary with grep-able teardown markers (`"hashline:tool-executors"`) in both repos.
- 73/73 tests passing across the full suite.

### Key Decisions
- Overlay preserves original `source` field so builtins stay "builtin" for policy compliance in `getCallableTools()`.
- `globalThis` is the primary discovery path; EventBus `on()` is insurance for late/dynamic re-registration.
- Bridge teardown condition: remove when pi adds `getToolExecutor()` to the ExtensionAPI.
- Phase 8 emitter was already implemented in hashline repo — verification-only APPLY.

---

## ✅ Milestone 5 — Python Helper Normalization (0.4.0)

**Completed:** 2026-03-18
**Duration:** approximately 15 minutes

### Stats

| Metric | Value |
|--------|-------|
| Phases | 2 |
| Plans | 2 |
| Files changed | 3 (runtime.py, index.ts, index.test.ts) |

### Key Accomplishments
- Added `_extract_text()` helper in `runtime.py` that normalizes `ReadResult` dicts back to raw text strings.
- `ptc.read_text()` now always returns `str` as documented.
- `ptc.read_many()` now always returns `list[str]` — common patterns like `content.split("\n")` work again.
- `ptc.read_tree()` returns `list[dict]` with `content` as `str` — `len(entry["content"])` works.
- `read()` itself unchanged — still `Union[str, ReadResult]` for models that want structured anchored data.
- Model-facing `code_execution` guidance updated with accurate signatures and clear `read()` vs `ptc.read_text()` distinction.
- 73/73 tests green, all helpers verified live in-session.

### Key Decisions
- Normalize in the helper layer, not in `read()` itself. Models that want structured data call `read()` directly.
- `_extract_text()` joins `lines[].raw` with newlines — faithful to the original file content.

---

## ✅ Milestone 6 — Review Findings Remediation (0.5.0)

**Completed:** 2026-03-19
**Duration:** approximately 20 minutes

### Stats

| Metric | Value |
|--------|-------|
| Phases | 2 |
| Plans | 2 |
| Files changed | 4 (rpc.py, runtime.py, index.ts, index.test.ts) |
| Findings resolved | 6 of 6 (0 deferred) |

### Key Accomplishments
- **E9 (HIGH):** Increased Python RPC `asyncio.StreamReader` limit from 64KB to 4MB. Files >250 lines no longer hang for 270s. README.md (530 lines) now reads in 7ms.
- **E8 (MEDIUM):** Added `_relativize_path()` + `_normalize_grep_result()` + grep wrapper in `runtime.py`. Grep record paths are now always workspace-relative regardless of bridge state. Grep → read pipelines work end-to-end.
- **D1+D4 (MEDIUM):** Removed 4 operator-facing rules (~400 chars) from the model-facing `code_execution` description. ptcValue, ptc.callable, PTC_CALLABLE_TOOLS, PTC_BLOCKED_TOOLS no longer in model prompt.
- **D2 (MEDIUM):** "Prefer these for string content" block and "Use read(path) directly for structured anchored data" guidance added.
- **D3 (LOW):** String content helpers documented inline alongside the existing bulk example.
- All findings verified live in-session. 73/73 tests green.

### Key Decisions
- 4MB StreamReader limit provides ~50x headroom over the old 64KB default.
- Grep path normalization happens in a runtime.py wrapper that captures the generated `grep()` at module load time.
- Python runtime loads from disk on every `code_execution` call — no session restart needed for Python-side fixes.
- `doesNotMatch` test assertions guard against accidental re-addition of operator rules.

---