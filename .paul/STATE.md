# Project State

## Project Reference
See: `.paul/PROJECT.md`

**Core value:** `pi-ptc-next` should execute the same active Pi tool implementations that the user sees in chat.
**Current focus:** Phase 31 is complete; prepare the plan for Phase 32.
## Current Position
Milestone: Milestone 12 — High-Level Orchestration Helpers
Phase: 32 of 32 (Proof and Ecosystem Docs) — Ready to Plan
Plan: Not started
Status: Ready for PLAN
Last activity: 2026-03-26 12:02:26 EDT — Unified .paul/phases/31-bounded-reduction-and-output-budget-helpers/31-01-PLAN.md and transitioned to Phase 32
Progress:
- Milestone 12 — High-Level Orchestration Helpers: [███████□□□] 67% ○
- Phase 30 — Core Orchestration Primitives: [██████████] 100% ✓
- Phase 31 — Bounded Reduction and Output-Budget Helpers: [██████████] 100% ✓
- Phase 32 — Proof and Ecosystem Docs: [□□□□□□□□□□] 0% ○
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

## Loop Position
Current loop state:
```text
PLAN ──▶ APPLY ──▶ UNIFY
  ✓        ✓        ✓     [Loop complete - ready for next PLAN]
```

## Accumulated Context
### Decisions
- Personal fork ownership is now the primary path; upstream PR preparation is retained only as optional reference material
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

### Deferred Issues
- Bridge teardown when pi adds getToolExecutor()
- `src/python-runtime/runtime.py` is now a significant debt hotspot at 656 lines after Phases 30-31 helper additions; future changes should avoid casual growth without justification

### Git State
- Phase closure commit: `feat(31-bounded-reduction-and-output-budget-helpers): add reduction and fit-output helpers`
- Branch: `feat/hashline-native-interop`
- Feature branches merged: none (git workflow mode: none)

## Session Continuity
Last session: 2026-03-26 12:02:26 EDT
Stopped at: Phase 31 complete, ready to plan Phase 32
Next action: /paul:plan
Resume file: .paul/ROADMAP.md
Resume context:
- Phase 31 shipped executor-aligned output-budget plumbing plus bounded `ptc.reduce_tool(...)` and `ptc.fit_output(...)`
- Focused execution proof in `test/reduction-helper.test.ts` is green, and full verification passed at `127` passing / `0` failing with the audit baseline unchanged (`0 critical / 2 high / 2 moderate / 1 low`)
- Phase 32 is now the proof/docs slice for documenting and proving the full Milestone 12 helper surface without reopening broader runtime design

---
*STATE.md — Updated after every significant action (last updated: 2026-03-26 12:02:26 EDT)*
