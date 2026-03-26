# Roadmap: @cegersdo/pi-ptc

## Overview
Brownfield PALS adoption for `pi-ptc-next`, focused on hashline-native runtime interop and structured Python integration.

## Current Milestone
**Milestone 12 — High-Level Orchestration Helpers** (0.11.0)
Status: 🚧 In Progress
Phases: 2 of 3 complete
| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 30 | Core Orchestration Primitives | 1/1 | ✅ Complete | 2026-03-26 |
| 31 | Bounded Reduction and Output-Budget Helpers | 1/1 | ✅ Complete | 2026-03-26 |
| 32 | Proof and Ecosystem Docs | TBD | Not started | - |
### Phase 30: Core Orchestration Primitives
Focus: Add generic `ptc.batch_tool(...)` and `ptc.first_success(...)` helpers that reduce repeated multi-tool invocation boilerplate while preserving provider-agnostic behavior.
Plans: 1/1 complete — see `.paul/phases/30-core-orchestration-primitives/30-01-SUMMARY.md`
### Phase 31: Bounded Reduction and Output-Budget Helpers
Focus: Add bounded reducers and output-budget helpers that keep large intermediate results local and return compact structured outcomes without introducing broader concurrency APIs.
Plans: 1/1 complete — see `.paul/phases/31-bounded-reduction-and-output-budget-helpers/31-01-SUMMARY.md`
### Phase 32: Proof and Ecosystem Docs
Focus: Add focused proof plus docs/examples for composing hashline, codegraph, and web-tool style flows with the new orchestration helpers.
Plans: TBD (defined during /paul:plan)
## Completed Milestones
<details>
<summary>Milestone 11 — Result-Kind and Tool Introspection Helpers (0.10.0) - 2026-03-26 (3 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 27 | Result-Kind Assertions | 1/1 | 2026-03-26 |
| 28 | Python Tool Introspection | 1/1 | 2026-03-26 |
| 29 | Proof and Docs | 1/1 | 2026-03-26 |
Notes:
- Milestone 11 added `ptc.expect_kind(...)`, `ptc.list_callable_tools()`, and `ptc.get_tool_schema(name)` as bounded Python helper ergonomics backed by focused proof.
- README and `code_execution` guidance now steer optional-tool branching through `ptc.list_callable_tools()` as the live callable session surface.

</details>
<details>
<summary>Milestone 10 — Typed Response and File Handle Helpers (0.9.0) - 2026-03-25 (2 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 25 | Response and File Handle Contract | 1/1 | 2026-03-25 |
| 26 | Python Helpers, Proof, and Docs | 1/1 | 2026-03-25 |

Notes:
- Milestone 10 established a bounded response/file handle contract around existing `responseId` / `filePath` follow-up flows without changing normalized tool result shapes.
- Python helper ergonomics now include `ptc.extract_handles()` / `ptc.first_handle()`, and supported response/file follow-up workflows are proven inside `code_execution`.
- Graph-handle ergonomics remain intentionally deferred until adjacent repos expose a stable public contract.

</details>
<details>
<summary>Milestone 9 — Release Readiness and Packaging (0.8.0) - 2026-03-25 (3 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 22 | Release Version and Packaging | 1/1 | 2026-03-25 |
| 23 | Changelog and Release Notes | 1/1 | 2026-03-25 |
| 24 | CI and Release Verification | 1/1 | 2026-03-25 |
Notes:
- Milestone 9 established a coherent `0.8.0` release baseline across package metadata, release docs, and verification-only CI.
- `.github/workflows/ci.yml` automates verification via `npm run verify:ci`, while publish/tag/git automation remains intentionally manual.
</details>
<details>
<summary>Milestone 8 — Personal Fork Hardening (0.7.0) - 2026-03-24 (3 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 19 | Personal Runtime Profile and Tool Surface | 1/1 | 2026-03-24 |
| 20 | Fork Workflow and Local Maintenance | 1/1 | 2026-03-24 |
| 21 | Optional Cleanup of Upstream PR Artifacts | 1/1 | 2026-03-24 |

Notes:
- Personal fork maintenance is now the primary workflow for this repository.
- Old upstream PR-prep material is retained as archived reference via `.paul/milestones/0.6.0-UPSTREAM-PR-ARTIFACTS.md`.
- Release/version/changelog/CI work remains deferred for a future milestone.

</details>
<details>
<summary>Milestone 7 — Upstream PR Preparation (0.6.0) - 2026-03-24 (4 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 15 | Upstream Scope Audit | 1/1 | 2026-03-24 |
| 16 | Branch Cleanup and Isolation | 1/1 | 2026-03-24 |
| 17 | Acceptance Hardening | 1/1 | 2026-03-24 |
| 18 | PR Materials and Submission Prep | 1/1 | 2026-03-24 |

Notes:
- Preferred upstream submission shape is a restore-based 2-PR split.
- Manual review-branch creation and upstream PR opening remain user-directed.

</details>
<details>
<summary>Milestone 1 — Active Tool Runtime Seam - 2026-03-16 (1 phase)</summary>
| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 1 | Active Tool Runtime Seam | 1/1 | 2026-03-16 |
</details>

<details>
<summary>Milestone 2 — Structured Results Contract - 2026-03-17 (3 phases)</summary>
| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 2 | Result Normalization | 1/1 | 2026-03-16 |
| 3 | Verification | 1/1 | 2026-03-17 |
| 4 | Interop Proof and Docs | 1/1 | 2026-03-17 |
</details>

<details>
<summary>Milestone 3 — Python Ergonomics and Metadata - 2026-03-17 (3 phases)</summary>
| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 5 | Python Helper Contracts | 1/1 | 2026-03-17 |
| 6 | PTC Metadata and Policy | 1/1 | 2026-03-17 |
| 7 | Combined Stack Docs and Demo | 1/1 | 2026-03-17 |
</details>

<details>
<summary>Milestone 4 — Cross-Extension Tool Execution Bridge - 2026-03-18 (3 phases)</summary>
| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 8 | Hashline Emitter | 1/1 | 2026-03-18 |
| 9 | PTC Subscriber | 1/1 | 2026-03-18 |
| 10 | Live Verification and Teardown | 1/1 | 2026-03-18 |
</details>

<details>
<summary>Milestone 5 — Python Helper Normalization - 2026-03-18 (2 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 11 | Runtime Helper Normalization | 1/1 | 2026-03-18 |
| 12 | Model Guidance and Live Verification | 1/1 | 2026-03-18 |

</details>

<details>
<summary>Milestone 6 — Review Findings Remediation - 2026-03-19 (2 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 13 | Runtime Fixes | 1/1 | 2026-03-19 |
| 14 | Model Guidance and Verification | 1/1 | 2026-03-19 |

Findings resolved: E9 (RPC buffer), E8 (grep paths), D1+D4 (description trim), D2 (read guidance), D3 (examples). 6/6, 0 deferred.

</details>

Suggested implementation branch from project docs:
- `feat/hashline-native-interop`

---
*Last updated: 2026-03-26 after Phase 31 completion*
