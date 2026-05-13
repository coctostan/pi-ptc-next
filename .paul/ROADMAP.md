# Roadmap: @cegersdo/pi-ptc

## Overview
Brownfield PALS adoption for `pi-ptc-next`, focused on hashline-native runtime interop and structured Python integration.

## Current Milestone
**Milestone 19 — Live Runtime Helper Hardening** (`0.18.0`)
Status: 🚧 In Progress
Phases: 0 of 4 complete

Focus: Convert live `code_execution` manual-test findings into tighter runtime behavior, clearer helper contracts, and regression proof.

Source findings: [`docs/issues/2026-05-13-code-execution-helper-edge-cases.md`](../docs/issues/2026-05-13-code-execution-helper-edge-cases.md)

| Phase | Name | Plans | Status | Completed |
|-------|------|-------|--------|-----------|
| 54 | Runner Availability and Command Reporting | 1/1 | Applying | - |
| 55 | Callable Wrapper Contract Consistency | TBD | Not started | - |
| 56 | Result Normalization and Partial-Error Semantics | TBD | Not started | - |
| 57 | Live Proof and Release Readiness | TBD | Not started | - |

### Phase 54: Runner Availability and Command Reporting
Focus: Decide and implement the default-runtime story for `ptc.run_tests(pattern)`, including Node availability, runner-unavailable guidance, and unambiguous command metadata.
Plans: `54-01-PLAN.md`

### Phase 55: Callable Wrapper Contract Consistency
Focus: Normalize or explicitly document callable wrapper async/positional behavior and generated signatures for `read`, `grep`, `find`, `glob`, and `ls`.
Plans: TBD (defined during /paul:plan)

### Phase 56: Result Normalization and Partial-Error Semantics
Focus: Tighten structured result shape/path normalization plus `read_many` and `batch_tool(..., on_error='collect')` treatment of tool-level error payloads.
Plans: TBD (defined during /paul:plan)

### Phase 57: Live Proof and Release Readiness
Focus: Add focused live/manual-style regression proof, refresh docs and release notes, and verify the `0.18.0` package baseline.
Plans: TBD (defined during /paul:plan)

## Completed Milestones
<details>
<summary>Milestone 18 — PTC Leverage and Output Shape (0.17.0) - 2026-05-12 (5 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 49 | Pi TUI Audit and Collapsible Code Body | 1/1 | 2026-05-12 |
| 50 | Structured Report Type | 1/1 | 2026-05-12 |
| 51 | Path Ergonomics and Bridge Helpers | 1/1 | 2026-05-12 |
| 52 | Callable-Tool Introspection | 1/1 | 2026-05-12 |
| 53 | Test Runner Verb | 1/1 | 2026-05-12 |

Archive: [milestones/0.17.0-ROADMAP.md](milestones/0.17.0-ROADMAP.md)

Notes:
- Added completed `code_execution` source expansion and clarified `nu` vs `code_execution` routing.
- Added `ptc.report(...)`, compact/expanded report rendering, and structured `details.report` preservation.
- Added root-aware path formatting plus `ptc.tabulate(...)` and shallow `ptc.diff(...)` bridge helpers.
- Added optional callable prompt metadata plus `ptc.help(tool_name)` for targeted runtime guidance.
- Added `ptc.run_tests(pattern)` for Node `node --test` structured reports; final verification closed at 236/236 passing and clean build.

</details>
<details>
<summary>Milestone 17 — Pi Compatibility and Prompt Integration Audit (0.16.0) - 2026-05-12 (4 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 45 | Pi API and Documentation Delta Audit | 1/1 | 2026-05-11 |
| 46 | Extension Runtime Compatibility Alignment | 1/1 | 2026-05-11 |
| 47 | System Prompt and Tool Guidance Optimization | 1/1 | 2026-05-11 |
| 48 | Compatibility Proof and Release Readiness | 1/1 | 2026-05-12 |

Notes:
- Established a Pi compatibility baseline against `@earendil-works/pi-coding-agent@0.74.0` and aligned local peers to the latest Mario-scope (`@mariozechner/*@0.73.1`) while preserving Mario imports and a `context` compatibility shim.
- Added `promptSnippet` / `promptGuidelines` registration for `code_execution`, made fallback auto-route prompt injection idempotent via `systemPromptOptions`, and threaded prompt metadata through custom tools.
- Shipped the `0.16.0` compatibility-proof release candidate (package/lockfile/`verify-release-package.sh` bump, `test/release-readiness.test.ts`, `docs/releases/0.16.0.md`, README/CHANGELOG/runbook repointing) with DEAN audit baseline acknowledged (4 critical / 0 high / 3 moderate / 0 low, override valid through 2026-06-11); advisory remediation is a deferred follow-up.

</details>
<details>
<summary>Milestone 16 — Publishable Fork Packaging (0.15.0) - 2026-03-29 (3 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 42 | Rename and Package Identity | 1/1 | 2026-03-27 |
| 43 | Publish Metadata and Documentation | 1/1 | 2026-03-29 |
| 44 | Release Verification and Publish Readiness | 1/1 | 2026-03-29 |

Notes:
- Renamed the fork/package surface to `pi-ptc-advanced@0.15.0` and aligned package metadata for publication.
- Updated README, changelog, maintainer docs, and release notes for the active package identity while preserving historical fork context.
- Removed packaged Python bytecode/cache artifacts from the tarball surface and proved packed-artifact installability under the manual publish model.

</details>
<details>
<summary>Milestone 15 — Bug Fixes and Helper Hardening (0.14.0) - 2026-03-27 (3 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 39 | P0 File-Discovery Repair | 1/1 | 2026-03-27 |
| 40 | Error-Handling Hardening | 1/1 | 2026-03-27 |
| 41 | Behavior Consistency and Follow-Up Proof | 1/1 | 2026-03-27 |

Notes:
- Repaired `ptc.read_tree()` / `ptc.find_files()` / `ptc.find_files_abs()` by removing helper reliance on unsupported `glob(limit=...)` and proving bounded behavior in live audit coverage.
- Hardened RPC close-path classification so syntax/compile-time Python failures surface actionable `PtcPythonError` context.
- Added explicit `batch_tool(..., on_error='collect')` partial-mode envelope and aligned `batch_tool([])` with list-style empty results.
- Tightened truncation framing to enforce `maxOutputChars` output caps while preserving best-effort notice behavior.
- Full verification baseline closed at `207` passing / `0` failing.

</details>

<details>
<summary>Milestone 14 — Live Tool Audit and Stress Testing (0.13.0) - 2026-03-26 (3 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 36 | Systematic Functionality Audit | 1/1 | 2026-03-26 |
| 37 | Stress and Edge Case Testing | 1/1 | 2026-03-26 |
| 38 | Composition Patterns and Audit Scorecard | 1/1 | 2026-03-26 |
Notes:
- 51 live-tool tests added: 21 helper + 8 pipeline + 15 stress + 7 composition
- 94% capabilities working, 1 P0 bug (glob/limit breaks find_files/find_files_abs/read_tree)
- Final audit: `.paul/phases/38-composition-patterns-and-audit-scorecard/FINAL-AUDIT.md`

</details>
<details>
<summary>Milestone 13 — Ecosystem Examples and Recipes (0.12.0) - 2026-03-26 (3 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 33 | Recipe Targets and Example Contracts | 1/1 | 2026-03-26 |
| 34 | Cross-Repo Recipes and Benchmark Fixtures | 1/1 | 2026-03-26 |
| 35 | Proof and Ecosystem Documentation | 1/1 | 2026-03-26 |
Notes:
- Milestone 13 added deterministic recipe-target contracts, concrete recipe artifacts for graph/web/hashline/mixed workflows, a recipe-only benchmark baseline, user-facing recipe documentation, and ecosystem composition proof.
- All four workflow types validated to compose through bounded PTC helpers without domain-specific imports.

</details>
<details>
<summary>Milestone 12 — High-Level Orchestration Helpers (0.11.0) - 2026-03-26 (3 phases)</summary>

| Phase | Name | Plans | Completed |
|-------|------|-------|-----------|
| 30 | Core Orchestration Primitives | 1/1 | 2026-03-26 |
| 31 | Bounded Reduction and Output-Budget Helpers | 1/1 | 2026-03-26 |
| 32 | Proof and Ecosystem Docs | 1/1 | 2026-03-26 |
Notes:
- Milestone 12 added `ptc.batch_tool(...)`, `ptc.first_success(...)`, `ptc.reduce_tool(...)`, and `ptc.fit_output(...)` as bounded orchestration/output-budget helpers for Python flows.
- Focused runtime proof plus README and generated `code_execution` guidance now cover compact hashline, codegraph, and web-tool composition examples for the helper surface.

</details>
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
*Last updated: 2026-05-13 after completing Phase 54 APPLY for Milestone 19*
