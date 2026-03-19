---
phase: 05-python-helper-contracts
plan: 01
completed: 2026-03-17T12:12:52Z
duration: ~30 minutes
---

## Objective
Improve Python helper ergonomics for hashline-native `read` / `grep` / `edit` interop by exposing clearer structured result models in helper contracts, generated wrappers, and model-facing `code_execution` guidance without changing runtime execution semantics.

## What Was Built
| File | Purpose | Lines |
|------|---------|-------|
| `src/tools/python-tool-contract.ts` | Upgraded builtin helper contracts so `read`, `grep`, and `edit` advertise structured anchored result models with fallback-safe unions/read-only metadata preserved. | 240 |
| `src/tools/tool-wrapper.ts` | Updated generated Python wrapper typing surface to emit richer anchored result TypedDicts and signatures for structured helper returns. | 98 |
| `src/index.ts` | Refined model-facing `code_execution` guidance so models understand `details.ptcValue` passthrough and richer active override contracts. | 251 |
| `test/python-tool-contract.test.ts` | Added regression coverage for structured builtin helper contracts and fallback-safe behavior. | 110 |
| `test/tool-wrapper.test.ts` | Added regression coverage for wrapper generation and anchored helper result models. | 74 |
| `test/index.test.ts` | Updated bootstrap/guidance assertions and test typing so helper guidance stays aligned with emitted contracts. | 218 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Structured helper contracts describe anchored builtin results clearly | PASS | `read` now returns `Union[str, ReadResult]`, `grep` returns `Union[List[GrepMatch], GrepResult]`, and `edit` returns `AnchoredEditResult` through the helper contract/wrapper layers. |
| AC-2 | Generated wrappers and model guidance reflect the richer helper ergonomics | PASS | Wrapper signatures/types were expanded for anchored models, and `src/index.ts` now tells models that `details.ptcValue` is passed through unchanged and that active overrides may return richer structured values. |
| AC-3 | Helper ergonomics changes remain regression-safe | PASS | Targeted tests and the full `npm test` suite passed with 54/54 tests green. |

## Verification Results
```text
$ npm test
> @cegersdo/pi-ptc@0.1.1 test
> npm run build && node --test test/*.test.ts

> @cegersdo/pi-ptc@0.1.1 build
> tsc

...
ℹ tests 54
ℹ pass 54
ℹ fail 0
```

Additional check:
- `lsp workspace-diagnostics` still reports duplicate block-scoped variable errors in `test/tool-wrapper.test.ts` and `test/index.test.ts`, but the TypeScript build/test pipeline is green. Treat as editor/LSP follow-up rather than a Phase 5 blocker.

## Deviations
- No scope deviations from plan intent. The implementation stayed within helper contracts, wrapper typing, model guidance, and associated tests.
- Test files received small typing refinements while aligning build-safe assertions with the richer helper contract surface.

## Key Patterns / Decisions
- Prefer builtin-specific structured helper result models over generic JSON blobs so Python users and models can reason about anchored data naturally.
- Keep fallback-safe behavior explicit: non-structured/custom tools still retain their existing defaults even when builtin helpers gain richer models.
- Clarify in model guidance that helper signatures are not the upper bound of active override behavior when `details.ptcValue` is present.

## Deferred / Follow-up Notes
- Phase 6 remains responsible for metadata and policy shape work; no metadata redesign was pulled into this phase.
- Phase 7 remains responsible for combined-stack docs/demo and optional full two-extension smoke-harness evaluation.

## Next Phase
Phase 5 is complete. Next: run `/skill:paul-plan` for Phase 6 — PTC Metadata and Policy.
