---
phase: 47-system-prompt-and-tool-guidance-optimization
plan: 01
subsystem: prompt-guidance
tags: [pi-compatibility, code_execution, promptSnippet, promptGuidelines, custom-tools]
requires:
  - phase: 45-pi-api-and-documentation-delta-audit
    provides: prompt-integration findings R-2 and Phase 47 remediation handoff
  - phase: 46-extension-runtime-compatibility-alignment
    provides: latest Mario-scope Pi compatibility baseline and sourceInfo compatibility decision
provides:
  - code_execution promptSnippet and active-only promptGuidelines for Pi default system prompt visibility
  - idempotent before_agent_start auto-route prompt fallback using systemPromptOptions
  - custom-tool promptSnippet/promptGuidelines preservation through registration
  - focused prompt-guidance tests and README/CHANGELOG notes
affects:
  - 48-compatibility-proof-and-release-readiness
tech-stack:
  added: []
  patterns:
    - Pi prompt metadata on registered tools with conservative fallback auto-routing
key-files:
  created:
    - test/prompt-guidance.test.ts
  modified:
    - src/index.ts
    - src/custom-tool-manager.ts
    - test/custom-tool-manager.test.ts
    - README.md
    - CHANGELOG.md
key-decisions:
  - "Decision: Use concise Pi prompt metadata plus an idempotent fallback route instead of broad tool-description rewrites."
patterns-established:
  - "Pattern: Custom tools may declare promptSnippet and promptGuidelines; PTC preserves both through registration."
  - "Pattern: Auto-route prompt injection checks systemPromptOptions and existing prompt text before appending fallback guidance."
duration: session-spanning
started: 2026-05-11T00:00:00Z
completed: 2026-05-11T23:00:00Z
---

# Phase 47 Plan 01: System Prompt and Tool Guidance Optimization Summary

`code_execution` now supplies concise Pi prompt metadata, preserves custom-tool prompt metadata, and keeps auto-routing non-duplicative when Pi system prompt options already carry equivalent guidance.

## Performance

| Metric | Value |
|--------|-------|
| Duration | Session-spanning APPLY plus UNIFY reconciliation |
| Started | 2026-05-11 |
| Completed | 2026-05-11 |
| Tasks | 3 auto tasks + 1 blocking wording checkpoint completed |
| Files modified | 6 product/test/doc files plus PALS lifecycle artifacts |

## Acceptance Criteria Results

| Criterion | Status | Notes |
|-----------|--------|-------|
| AC-1: `code_execution` prompt metadata is collaboratively approved and registered | PASS | User-approved wording was implemented as `CODE_EXECUTION_PROMPT_SNIPPET` plus four concise `CODE_EXECUTION_PROMPT_GUIDELINES`; registration now sets `promptSnippet` and `promptGuidelines`. |
| AC-2: Auto-routing is idempotent with Pi system prompt options | PASS | `applyAutoRouting()` now checks `systemPromptOptions.selectedTools`, `systemPromptOptions.promptGuidelines`, and existing system prompt text before appending fallback routing guidance. |
| AC-3: Custom tool prompt metadata survives registration | PASS | `buildRegisteredTool()` copies through custom-tool `promptSnippet` and `promptGuidelines`; regression coverage proves `loadCustomToolsFromDir()` preserves both fields. |
| AC-4: User-facing docs describe the prompt integration boundary | PASS | README and CHANGELOG document Pi prompt metadata behavior without claiming an `@earendil-works/*` migration or final `0.16.0` release readiness. |

## Module Execution Reports

### Pre-UNIFY Dispatch

[dispatch] pre-unify: 0 modules registered for this hook

### Carried-Forward APPLY Evidence

| Module / Gate | Result |
|---------------|--------|
| TODD | PASS — TDD sequence honored: RED prompt/custom-tool metadata tests landed before runtime implementation. |
| Prompt checkpoint | PASS — wording was approved interactively before Task 2 implementation; implemented wording matched the approved concise snippet/guidelines/fallback sentence. |
| WALT / verification | PASS — focused and full verification passed; final UNIFY rerun `npm test && npm run build` reported 213 passing / 0 failing and clean TypeScript build. |
| DEAN | NOTE — `npm audit --json` during UNIFY currently reports 4 critical / 0 high / 3 moderate findings, including transitive Mario-scope Pi advisories. This is outside Phase 47 implementation scope and is carried forward to Phase 48 release-readiness/audit reconciliation. |

### WALT

[dispatch] post-unify: WALT PASS — appended `.paul/quality-history.md` row for Phase 47 with `213 passing / 0 failing`, no separate lint command, clean `npm run build`, and improving/stable green trend.

### CODI

[dispatch] CODI post-unify: hook body entered for 47-01

[dispatch] CODI post-unify: appended injected row for 47-01

CODI read the PLAN `<module_dispatch>` evidence and recorded the Phase 47 blast-radius outcome as `injected` with R=4, U=0, K=10 and symbols `buildToolDescription`, `buildCodeExecutionTool`, `applyAutoRouting`, `handleBeforeAgentStart`, and `buildRegisteredTool`.

### SKIP

[dispatch] post-unify: SKIP captured complete knowledge entries from the Phase 47 summary.

#### 2026-05-11 Surface `code_execution` through Pi prompt metadata with fallback idempotence

**Type:** decision
**Phase:** 47 — System Prompt and Tool Guidance Optimization
**Related:** `src/index.ts`, `src/custom-tool-manager.ts`, `README.md`, `CHANGELOG.md`

**Context:** Phase 45 found that `code_execution` was not visible in Pi's default available-tools prompt section and custom-tool prompt metadata was dropped during PTC registration.

**Decision:** Use Pi `promptSnippet` / `promptGuidelines` metadata for the default prompt surface and keep `before_agent_start` auto-routing as a conservative fallback that is skipped when equivalent `systemPromptOptions` or system prompt text already exists.

**Alternatives considered:**
- Broadly rewrite the long tool description — rejected because it risks duplicating deep runtime helper guidance and increasing prompt budget pressure.
- Rely only on auto-route prompt injection — rejected because it does not make `code_execution` visible through Pi's native tool prompt metadata path.

**Rationale:** Concise prompt metadata makes the intended use cases visible in the native Pi prompt path while preserving the detailed operational helper inventory in the tool description.

**Impact:** Future prompt changes should keep high-level routing guidance in metadata and avoid duplicate fallback text when Pi already selected `code_execution` guidance.

### RUBY

[dispatch] post-unify: RUBY WARN — ESLint complexity analysis was not available as a project script/dependency, so fallback line/debt screening was used.

| File | Lines | Debt signal |
|------|------:|-------------|
| `src/index.ts` | 484 | WARN — existing large implementation file; Phase 47 kept changes focused. |
| `src/custom-tool-manager.ts` | 271 | PASS |
| `test/prompt-guidance.test.ts` | 179 | PASS |
| `test/custom-tool-manager.test.ts` | 347 | WARN — existing larger companion test; growth was bounded to metadata preservation coverage. |
| `README.md` | 850 | CRITICAL size hotspot; two literal TODO/FIXME example strings are existing documentation examples, not implementation debt. |
| `CHANGELOG.md` | 58 | PASS |

Recommendation: Phase 48 release-readiness/docs work should avoid broad README growth; prefer release notes or focused sections if more compatibility proof must be documented.

## Accomplishments

- Added focused RED coverage for `code_execution` prompt metadata, auto-route idempotence with `systemPromptOptions`, and custom-tool prompt metadata passthrough.
- Registered approved `code_execution` `promptSnippet` and `promptGuidelines` while preserving the deep helper inventory in the tool description.
- Made fallback auto-routing idempotent with Pi-selected tools/guidelines and existing system prompt text.
- Preserved custom-tool `promptSnippet` / `promptGuidelines` through `CustomToolManager` registration.
- Updated README and CHANGELOG with bounded prompt integration notes that preserve the Phase 46 Mario-scope compatibility target.

## Task Commits

| Task | Commit | Type | Description |
|------|--------|------|-------------|
| Task 1 RED: Add prompt metadata regression coverage | `9b74011` | test | Added failing prompt-guidance and custom-tool metadata preservation coverage. |
| Task 2 GREEN: Implement approved prompt metadata and idempotent routing | `b514552` | feat | Registered approved prompt metadata, implemented idempotent fallback routing, and preserved custom-tool prompt metadata. |
| Task 3: Document prompt metadata behavior and run full verification | `7e77430` | docs | Updated README/CHANGELOG prompt metadata guidance. |

Plan metadata: `.paul/phases/47-system-prompt-and-tool-guidance-optimization/47-01-PLAN.md`

## Files Created/Modified

| File | Change | Purpose |
|------|--------|---------|
| `test/prompt-guidance.test.ts` | Created | Focused prompt metadata and auto-route idempotence regression coverage. |
| `test/custom-tool-manager.test.ts` | Modified | Custom-tool fixture proves prompt metadata survives loading/registration. |
| `src/index.ts` | Modified | Adds approved prompt metadata constants, metadata registration, and idempotent system-prompt fallback checks. |
| `src/custom-tool-manager.ts` | Modified | Preserves custom-tool `promptSnippet` and `promptGuidelines`. |
| `README.md` | Modified | Documents prompt metadata and custom-tool prompt metadata support. |
| `CHANGELOG.md` | Modified | Adds Unreleased Phase 47 prompt-guidance note. |

## Verification

| Command | Result |
|---------|--------|
| `npm run build && node --test test/prompt-guidance.test.ts test/custom-tool-manager.test.ts` | PASS during APPLY focused verification. |
| `npm test && npm run build` | PASS during APPLY and rerun during UNIFY; final run reported 213 tests, 213 passing, 0 failing, and clean `tsc`. |
| `npm audit --json` | NON-BLOCKING NOTE — current advisory feed reports 4 critical / 0 high / 3 moderate; dependency remediation remains outside Phase 47 and is carried to Phase 48 release-readiness reconciliation. |

## Decisions Made

| Decision | Rationale | Impact |
|----------|-----------|--------|
| Use concise Pi prompt metadata plus idempotent fallback routing | Makes `code_execution` visible in Pi's native prompt path without duplicating deep helper guidance or broad prompt rewrites. | Future prompt guidance should separate high-level routing metadata from detailed runtime helper documentation. |
| Preserve Mario-scope compatibility wording in docs | Phase 46 deliberately targeted latest Mario-scope Pi packages, not a hard `@earendil-works/*` runtime migration. | Phase 48 release readiness must continue to distinguish compatibility evidence from package-scope migration claims. |

## Deviations from Plan

### Summary

| Type | Count | Impact |
|------|-------|--------|
| Auto-fixed | 0 | None |
| Scope additions | 0 | None |
| Deferred | 1 | Dependency audit advisory counts changed during UNIFY and are carried to Phase 48. |

**Total impact:** Plan executed as scoped; audit advisory churn is release-readiness follow-up, not a Phase 47 implementation blocker.

### Auto-fixed Issues

None.

### Deferred Items

- Phase 48: reconcile current `npm audit --json` critical/moderate findings against the existing DEAN baseline and the Mario-scope compatibility target before declaring `0.16.0` release readiness.

## Issues Encountered

| Issue | Resolution |
|-------|------------|
| Prompt wording required human approval before runtime implementation. | APPLY paused for the checkpoint; approved wording was implemented exactly in Task 2. |
| `npm audit --json` advisory counts changed from the APPLY note during UNIFY. | Recorded as a non-blocking release-readiness carry-forward because Phase 47 did not change dependencies. |

## Next Phase Readiness

**Ready:**
- Phase 48 can build on native Pi prompt metadata coverage, idempotent auto-routing, and custom-tool prompt metadata preservation.
- Final verification is green locally with 213/213 tests passing and clean TypeScript build.

**Concerns:**
- Release-readiness proof must reconcile the current dependency audit advisory feed, including transitive Mario-scope Pi critical findings.
- README remains a size hotspot; Phase 48 documentation should stay bounded.

**Blockers:**
- None for planning Phase 48.

---
*Phase: 47-system-prompt-and-tool-guidance-optimization, Plan: 01*
*Completed: 2026-05-11*
