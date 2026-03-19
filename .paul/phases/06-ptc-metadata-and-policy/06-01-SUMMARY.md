---
phase: 06-ptc-metadata-and-policy
plan: 01
completed: 2026-03-17T12:34:59Z
duration: ~20 minutes
---

## Objective
Clarify and extend the PTC metadata and policy contract for extension tools so callable exposure and safety expectations are expressed explicitly, remain backward-compatible with legacy metadata, and are documented for combined `pi-ptc-next` + hashline-native use.

## What Was Built
| File | Purpose | Lines |
|------|---------|-------|
| `src/contracts/tool-types.ts` | Added explicit Phase 6 metadata types (`ptc.callable`, `ptc.policy`) plus normalization helpers while preserving legacy metadata compatibility. | 94 |
| `src/tool-registry.ts` | Normalized extension metadata at registry boundaries and applied clarified callable/policy rules without changing builtin execution semantics. | 300 |
| `src/index.ts` | Updated `code_execution` guidance to explain explicit metadata opt-in and operator-level policy filters. | 253 |
| `src/utils.ts` | Hardened env-list parsing so policy allow/block/trusted lists are deduplicated consistently. | 120 |
| `test/tool-registry.test.ts` | Added regression coverage for explicit metadata, legacy compatibility, callable gating, and mutating-tool policy behavior. | 333 |
| `test/custom-tool-manager.test.ts` | Updated custom tool loading coverage to assert the new metadata shape round-trips from extension files. | 219 |
| `test/index.test.ts` | Extended bootstrap/guidance assertions to keep runtime guidance aligned with the new metadata/policy contract. | 223 |
| `test/utils.test.ts` | Added settings parsing coverage for policy lists and fixed file-module diagnostics friction. | 64 |
| `docs/hashline-integration/START-HERE.md` | Documented the recommended Phase 6 metadata and policy setup for hashline-native combined use. | 62 |
| `docs/hashline-integration/ROADMAP.md` | Recorded the explicit metadata/policy direction for Milestone 3. | 90 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Extension tool metadata can express callable intent and policy-relevant traits clearly | PASS | `PtcToolOptions` now supports explicit `callable` and `policy`, with normalization preserving legacy `enabled` / `readOnly` behavior. |
| AC-2 | Callable-tool policy honors the clarified metadata without regressing safety | PASS | `ToolRegistry` now filters extension tools through normalized metadata, keeps builtin behavior intact, and regression tests cover trusted read-only, mutating, hidden, and legacy cases. |
| AC-3 | Metadata and policy guidance are documented for extension authors and combined-stack users | PASS | `code_execution` guidance and hashline integration docs now describe explicit metadata opt-in plus `PTC_CALLABLE_TOOLS`, `PTC_BLOCKED_TOOLS`, and `PTC_TRUSTED_READ_ONLY_TOOLS` behavior. |

## Verification Results
```text
$ npm test
> @cegersdo/pi-ptc@0.1.1 test
> npm run build && node --test test/*.test.ts

...
ℹ tests 58
ℹ pass 58
ℹ fail 0
```

Additional checks completed during APPLY:
- `npm run build && node --test test/custom-tool-manager.test.ts test/tool-registry.test.ts`
- `npm run build && node --test test/index.test.ts test/utils.test.ts test/tool-registry.test.ts`
- `lsp workspace-diagnostics` reported no error diagnostics for the touched source/test files after the test-file module fix.

## Deviations
- No scope deviations from the plan intent.
- During APPLY, three test files (`test/tool-registry.test.ts`, `test/utils.test.ts`, `test/index.test.ts`) received minimal type-only module markers to resolve block-scoped redeclaration diagnostics without changing runtime behavior.
- `src/contracts/settings.ts` remained structurally unchanged; the effective behavior change for settings parsing landed in `src/utils.ts` and guidance/tests.

## Key Patterns / Decisions
- Prefer explicit `ptc.callable` / `ptc.policy` metadata for extension tools, but normalize legacy `ptc.enabled` / `ptc.readOnly` so existing tools do not break.
- Keep operator-level filters (`PTC_CALLABLE_TOOLS`, `PTC_BLOCKED_TOOLS`, `PTC_TRUSTED_READ_ONLY_TOOLS`) layered on top of metadata rather than replacing metadata.
- Preserve builtin callable behavior and mutation protections exactly; Phase 6 clarified extension policy semantics, not core runtime execution.

## Deferred / Follow-up Notes
- Phase 7 remains responsible for the end-to-end hashline-native demo workflow and any broader combined-stack walkthrough.
- Evaluation of a heavyweight real two-extension smoke harness remains deferred to Phase 7.
- Some CommonJS-style tests still emit non-blocking LSP hints around `require(...)` / inferred types, but there are no blocking diagnostics and the build/test pipeline is green.

## Next Phase
Phase 6 is complete. Next: run `/skill:paul-plan` for Phase 7 — Combined Stack Docs and Demo.
