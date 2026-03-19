---
phase: 07-combined-stack-docs-and-demo
plan: 01
completed: 2026-03-17T13:05:01Z
duration: ~18 minutes
---

## Objective
Close Milestone 3 by making the combined `pi-ptc-next` + `pi-hashline-readmap` stack discoverable and reproducible through focused documentation: a canonical search -> inspect -> edit demo, aligned setup/policy guidance, and an explicit recommendation on the optional heavier two-extension harness.

## What Was Built

| File | Purpose | Lines |
|------|---------|-------|
| `README.md` | Added combined-stack entry points, aligned custom tool metadata guidance around `ptc.callable` / `ptc.policy`, and linked the new demo/harness docs. | 422 |
| `docs/hashline-integration/START-HERE.md` | Reworked the combined-stack quick-start to cover setup, policy interaction, active override expectations, and doc navigation. | 107 |
| `docs/hashline-integration/ROADMAP.md` | Reframed the hashline roadmap around delivered milestone outcomes and the current lightweight-proof recommendation. | 96 |
| `docs/hashline-integration/DEMO.md` | Added the canonical end-to-end search -> inspect -> edit walkthrough for hashline-native Python workflows. | 155 |
| `docs/hashline-integration/HARNESS-EVALUATION.md` | Documented what the existing smoke proof covers, what a heavier paired-extension harness would add, and why it remains deferred for now. | 76 |

## Acceptance Criteria Results

| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Canonical end-to-end demo exists | PASS | `docs/hashline-integration/DEMO.md` now provides the primary search -> inspect -> edit walkthrough, and `README.md` / `START-HERE.md` point readers to it. |
| AC-2 | Setup and policy guidance is consistent across docs | PASS | `README.md`, `START-HERE.md`, and `ROADMAP.md` now align on explicit `ptc.callable` / `ptc.policy` guidance, legacy compatibility, operator-level filters, and the distinction between fallback normalization and active override payloads. |
| AC-3 | Harness strategy is explicit | PASS | `docs/hashline-integration/HARNESS-EVALUATION.md` records the recommendation to keep `test/hashline-interop-smoke.test.ts` as the main proof point and defer a heavier real two-extension harness until packaging-level evidence justifies it. |

## Verification Results

Documentation-focused verification completed during APPLY:

```text
- Reviewed README.md + docs/hashline-integration/{START-HERE,DEMO,ROADMAP,HARNESS-EVALUATION}.md end-to-end for consistency and cross-links.
- Confirmed all referenced files and commands exist in the repo.
- Confirmed the lightweight smoke-proof command/path remains:
  npm run build
  node --test test/hashline-interop-smoke.test.ts
```

## Deviations
- No significant deviations from the approved plan.
- The work remained documentation-only; no runtime/source/test behavior changes were needed.
- Git commit/remote automation remained intentionally skipped because this repo is operating under user-directed git workflow constraints.

## Key Patterns / Decisions
- Prefer `ptc.callable` / `ptc.policy` as the primary documentation language for extension tools while continuing to acknowledge legacy `ptc.enabled` / `ptc.readOnly` compatibility.
- Keep the canonical human-facing demo separate from the README so the top-level docs can link to one authoritative combined-stack walkthrough instead of duplicating detailed steps.
- Treat the lightweight smoke proof as the default milestone-level verification artifact unless future packaging or activation problems justify a heavier real paired-extension harness.

## Next Phase
Milestone 3 is now complete. Next: wait for user direction on the next milestone or any release-oriented follow-up, with this summary as the closure reference for Phase 7.
