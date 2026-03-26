# Project State

## Project Reference
See: `.paul/PROJECT.md`

**Core value:** `pi-ptc-next` should execute the same active Pi tool implementations that the user sees in chat.
**Current focus:** Milestone 13 is open; plan the first ecosystem-recipes phase from the M4 build-map requirements.
## Current Position
Milestone: Milestone 13 — Ecosystem Examples and Recipes
Phase: 33 of 35 (Recipe Targets and Example Contracts)
Plan: Not started
Status: Ready to plan
Last activity: 2026-03-26 13:14:47 EDT — Created Milestone 13 from the M4 ecosystem-recipes build map
Progress:
- Milestone 13 — Ecosystem Examples and Recipes: [░░░░░░░░░░] 0%
- Phase 33 — Recipe Targets and Example Contracts: [░░░░░░░░░░] 0%
- Phase 34 — Cross-Repo Recipes and Benchmark Fixtures: [░░░░░░░░░░] 0%
- Phase 35 — Proof and Ecosystem Documentation: [░░░░░░░░░░] 0%
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

## Loop Position
Current loop state:
```text
PLAN ──▶ APPLY ──▶ UNIFY
  ○        ○        ○     [Ready for first PLAN]
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
- Phase 32 closed Milestone 12 with focused ecosystem proof/docs in `README.md`, `src/index.ts`, and dedicated focused tests instead of reopening runtime semantics
- README and generated `code_execution` guidance now both document `ptc.batch_tool(...)`, `ptc.first_success(...)`, `ptc.reduce_tool(...)`, and `ptc.fit_output(...)` with compact hashline/codegraph/web examples and contract coverage
- Milestone 12 verification improved from `127` passing / `0` failing to `132` passing / `0` failing while the dependency audit baseline stayed unchanged

### Deferred Issues
- Bridge teardown when pi adds getToolExecutor()
- `src/python-runtime/runtime.py` is now a significant debt hotspot at 656 lines after Phases 30-31 helper additions; future changes should avoid casual growth without justification
- Existing docs/test hotspots remain in `README.md` (821 lines), `src/index.ts` (423 lines), and `test/index.test.ts` (1219 lines); future proof/docs work should keep using focused companion files or extract sections before growing those anchors further

### Git State
- Last committed checkpoint: `feat(milestones-9-12): checkpoint shipped helpers, docs, and proof`
- Branch: `feat/hashline-native-interop`
- Worktree: clean immediately before Milestone 13 creation
- Feature branches merged: none (git workflow mode: none)

## Session Continuity
Last session: 2026-03-26 13:14:47 EDT
Stopped at: Milestone 13 created, ready to plan Phase 33
Next action: /paul:plan for Phase 33
Resume file: .paul/ROADMAP.md
Resume context:
- Milestone 13 now tracks the M4 ecosystem-examples work from `~/pi/workspace/thinkingspace/plans/2026-03-24-agent-ecosystem/pi-ptc-next.md`
- The milestone starts with Phase 33 to define recipe targets and example contracts before implementation and final proof/docs
- Recent Milestones 9-12 work is checkpointed in `c020a08`, and the worktree was clean before milestone creation

---
*STATE.md — Updated after every significant action (last updated: 2026-03-26 13:14:47 EDT)*
