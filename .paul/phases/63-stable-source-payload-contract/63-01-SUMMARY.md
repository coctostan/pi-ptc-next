# Phase 63 Plan 01 Summary — Stable Source Payload Contract

## Status

UNIFY completed for `.paul/phases/63-stable-source-payload-contract/63-01-PLAN.md`; GitHub Flow merge gate is pending PR checks.

## What changed

- Added `ExecutionFailureDetails` and `ExecutionDetails.failure` so user-code Python failures can carry structured failure metadata alongside existing metrics.
- Extended `PtcPythonError` with optional structured execution details while preserving class names, `rawMessage`, traceback formatting, and existing thrown-error behavior for errors without source details.
- Updated `RpcProtocol` so complete results, execution progress, generic updates, nested tool-call updates, framed Python errors, and pre-terminal Python stderr failures all include original user Python source in `details.userCode`.
- Updated `buildCodeExecutionTool.execute` so source-bearing user-code Python failures return a structured tool result with compact error content plus telemetry/recovery details, instead of throwing and losing details.
- Added focused regression coverage in:
  - `test/rpc-protocol.test.ts`
  - `test/execution-errors.test.ts`
  - `test/index.test.ts`

`src/code-executor.ts` did not require source edits; it already preserves typed/user-code Python errors through the executor boundary.

## Acceptance criteria

- AC-1 Success Details Include Source: PASS — complete RPC frames now include `details.userCode` and preserve `details.report` / `reportProduced`.
- AC-2 User-Code Failure Results Include Source: PASS — framed and pre-terminal Python failures carry `details.userCode` plus structured failure metadata; source-bearing Python failures become structured failed tool results at the tool boundary.
- AC-3 Partial Updates Deliberately Carry Source: PASS — progress, generic update, and nested tool-call partial details include `details.userCode`; progress still includes `currentLine` / `totalLines`.
- AC-4 Report and Existing Error Semantics Stay Compatible: PASS — report details, error class names, traceback formatting, typed error pass-through, telemetry, and recovery details remain compatible.

## Verification

- RED evidence: focused tests failed before implementation for missing `PtcPythonError.details`, missing success/partial/error `userCode`, and missing structured failure tool-result behavior.
- `npm run build && node --test test/rpc-protocol.test.ts test/execution-errors.test.ts test/code-executor.test.ts test/index.test.ts`: PASS, 33 tests passing.
- `npm test`: PARTIAL/PRE-EXISTING FAILURE — build passed and 259 tests passed; 9 existing hashline live contract tests still fail because the local Node binary rejects `--experimental-transform-types` (`node: bad option: --experimental-transform-types`). The same 9 failures were present in the pre-APPLY baseline and are unrelated to Phase 63 files.
- Manual inspection: Python source is carried in structured `details.userCode` and is not appended to normal success output or compact Python error content.

## Module Execution Reports

- `[dispatch] pre-apply: TODD PASS` — approved plan is TDD and began with RED tests; RED failures captured before implementation.
- `[dispatch] pre-apply: WALT BASELINE` — `npm test` baseline had 253 passing / 9 failing due existing `--experimental-transform-types` incompatibility in hashline live tests.
- `[dispatch] post-task(Task 1): TODD PASS` — RED focused tests failed for the expected missing source-details behavior before implementation.
- `[dispatch] post-task(Task 2): TODD PASS` — focused build/test command passed after GREEN implementation.
- `[dispatch] post-task(Task 3): TODD PASS_WITH_CONCERNS` — focused verification passed; full suite retained the same pre-existing hashline Node-option failures.
- `[dispatch] post-apply advisory: ARCH PASS` — changed files remain within the existing flat source/test layout; no new boundary layer introduced.
- `[dispatch] post-apply advisory: ARIA/LUKE/DANA/DAVE/GABE SKIP` — no changed UI, data/migration, CI, or API route/schema files.
- `[dispatch] post-apply advisory: DOCS PASS_WITH_CONCERNS` — no README/docs changes; contract work is covered by tests and Phase 65 remains the planned docs handoff.
- `[dispatch] post-apply advisory: IRIS PASS` — no review markers or dead-code concerns were introduced in changed source/test files.
- `[dispatch] post-apply advisory: OMAR/REED/PETE/VERA PASS_WITH_CONCERNS` — error/result handling changed intentionally; no new logging, retry, performance-sensitive loop, or privacy-data exposure was introduced.
- `[dispatch] post-apply enforcement: DEAN PASS` — `npm audit --json` remained at 0 critical / 0 high / 3 moderate, matching the pre-plan baseline.
- `[dispatch] post-apply enforcement: WALT PASS_WITH_CONCERNS` — no new focused regressions; full-suite failures are unchanged environmental Node-option failures.
- `[dispatch] post-apply enforcement: TODD PASS_WITH_CONCERNS` — TDD scope complete; full suite baseline concern unchanged.
- `[dispatch] pre-unify: 0 modules registered for this hook`.
- `[dispatch] post-unify: WALT PASS_WITH_CONCERNS` — quality history updated for 33 focused passing tests and the unchanged full-suite Node-option failure baseline.
- `[dispatch] post-unify: CODI no-dispatch-found` — PLAN had degraded pre-plan CODI evidence but no post-unify CODI dispatch block requiring new blast-radius history.
- `[dispatch] post-unify: RUBY PASS` — no refactor follow-up beyond keeping Phase 64 rendering separate.
- `[dispatch] post-unify: SKIP candidate recorded in SUMMARY only` — durable handoff is the stable `details.userCode`/`details.failure` contract for Phase 64; no separate knowledge artifact needed.

## Deviations

- Per-task implementation landed in one working-tree slice rather than separate task commits; RED evidence was still captured before implementation, and focused parent verification passed after GREEN/REFACTOR.
- `src/code-executor.ts` was intentionally left unchanged after tests confirmed pass-through behavior.
- Full-suite `npm test` remains blocked by pre-existing Node runtime support for `--experimental-transform-types`; this phase did not change those tests or runtime assumptions.

## Handoff to Phase 64

Phase 64 can rely on stable structured payloads:

- `details.userCode` is present for running partials, generic updates, nested tool-call updates, successful completions, and structured user-code Python failures.
- Structured Python-failure results include `details.failure` plus telemetry/recovery metadata at the tool boundary.
- Source remains out of normal success/error strings, preserving the UI/rendering separation for Phase 64 collapsed/expanded presentation work.
