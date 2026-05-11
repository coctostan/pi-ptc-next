---
phase: 40-error-handling-hardening
plan: 01
completed: 2026-03-27T18:30:34Z
duration: "~1h (including focused + full-suite verification)"
---

## Objective
Harden Python failure handling so syntax/compile-time failures surface actionable error detail (including `SyntaxError` context) instead of generic transport-closure messaging, while preserving normal RPC success/error behavior.

## What Was Built
| File | Purpose | Current Lines |
|------|---------|---------------|
| `src/rpc-protocol.ts` | Added stderr-aware unexpected-close classification to emit `PtcPythonError` for Python pre-terminal syntax/traceback failures, while preserving transport errors for non-Python shutdowns | 482 |
| `test/rpc-protocol.test.ts` | Added focused regression coverage for syntax-vs-transport classification on unexpected close | 196 |
| `test/live-audit-pipeline.test.ts` | Updated live pipeline audit expectation to require actionable syntax context and reject generic stdout-closed fallback messaging | 204 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Syntax/compile-time Python failures surface actionable context | PASS | `RpcProtocol` now inspects pre-terminal stderr signatures (`Traceback`, syntax/import/tab/indentation errors), extracts an error summary, and emits `PtcPythonError(summary, stderr)` on unexpected close |
| AC-2 | Non-syntax transport behavior remains stable | PASS | Non-Python stderr shutdowns still produce `PtcTransportError`; existing buffered-complete and protocol-frame behavior tests remained green |
| AC-3 | Focused + live audit tests explicitly lock hardened behavior | PASS | New focused protocol tests and updated live pipeline syntax assertion both pass; full suite remains green |

## Verification Results
| Command | Result |
|---------|--------|
| `npm run build` | PASS |
| `node --test test/rpc-protocol.test.ts` | PASS (10/10) |
| `node --test test/live-audit-pipeline.test.ts` | PASS (8/8) |
| `npm test` | PASS (205 passing / 0 failing) |

## Module Execution Reports
### Carried-forward APPLY module evidence
- `[dispatch] pre-apply`:
  - TODD(50) baseline/test infrastructure detected
  - WALT(100) baseline recorded
- `[dispatch] post-task`: TODD enforcement checks passed for all auto tasks
- `[dispatch] post-apply advisory`:
  - IRIS(250): no focused complexity/unused-var findings on changed files
  - DOCS(250): advisory drift noted (`README.md` and `CHANGELOG.md` not updated for runtime behavior change)
  - RUBY(300): not applicable in post-apply (registered on post-unify)
  - SKIP(300): no table-formatted decision records available for extraction in STATE at apply time
- `[dispatch] post-apply enforcement`:
  - WALT(100): PASS (no quality regression)
  - DEAN(150): PASS (0 critical / 2 high / 3 moderate / 1 low; no new critical/high)
  - TODD(200): PASS (full suite green)

### Pre-UNIFY dispatch
- `[dispatch] pre-unify: 0 modules registered for this hook`

### Post-UNIFY dispatch
- `[dispatch] post-unify: WALT(100) → 1 report / 1 side effect | SKIP(200) → 1 report / 0 side effects | RUBY(300) → 1 report / 0 side effects`
- WALT report:
  - Quality delta remained green and improved pass count (203→205)
  - Side effect: appended Phase 40 row to `.paul/quality-history.md`
- SKIP report:
  - Captured Phase 40 knowledge entries from this SUMMARY (decision + rationale + deferred follow-up) for durable context in this artifact
- RUBY report:
  - `npx eslint --no-config-lookup --rule 'complexity: [warn, 10]' --rule 'no-unused-vars: warn' --format json src/rpc-protocol.ts test/rpc-protocol.test.ts test/live-audit-pipeline.test.ts` reported no issues
  - `wc -l` debt signal: `src/rpc-protocol.ts` at 482 lines (warn-level hotspot, below 500 critical threshold)

## Deviations
1. **Reconciliation source mismatch (commit-range vs working tree):**
   - `git diff --stat 43afdec..HEAD` only reflected `.paul/*` history, while planned runtime/test changes existed in working tree (not yet phase-committed).
   - Resolution: reconciled Phase 40 implementation using direct working-tree diffs for planned files (`src/rpc-protocol.ts`, `test/rpc-protocol.test.ts`, `test/live-audit-pipeline.test.ts`).
   - Impact: no product-scope drift; documentation explicitly records the mismatch source.
2. **Existing dirty tree at APPLY/UNIFY time:**
   - Pre-existing out-of-scope modifications were already present before Phase 40 execution.
   - Resolution: bounded edits to the three planned files only.
   - Impact: no scope expansion during this phase.
3. **Doc drift advisory accepted (non-blocking):**
   - Runtime behavior messaging changed, but `README.md`/`CHANGELOG.md` were intentionally not updated in this phase.
   - Impact: follow-up docs touch may be appropriate in a later documentation-focused slice.
4. **GitHub-flow merge gate deferred in this UNIFY pass:**
   - Repository already had mixed pre-existing tracked/untracked changes outside Phase 40 scope.
   - Resolution: completed reconciliation/state transition artifacts without auto commit/push/PR merge.
   - Impact: Phase documentation and planning continuity are complete; git/PR hygiene remains an explicit follow-up action if strict merge-gate enforcement is desired.

## Key Patterns / Decisions
- Keep classification logic narrow and deterministic at the TypeScript RPC boundary rather than broad runtime refactoring.
- Delay terminal close rejection with a microtask so stderr/exit metadata can be recorded first.
- Treat Python-traceback/syntax signatures as execution errors (`PtcPythonError`) and preserve generic transport handling for non-Python shutdown text.

## Deferred Issues
- Phase 41 still owns broader behavior-consistency work (`ptc.batch_tool(...)` partial-result policy, empty-input consistency, truncation framing policy).
- `src/rpc-protocol.ts` remains a medium debt hotspot after this focused hardening slice.

## Next Phase
- Proceed to **Phase 41 — Behavior Consistency and Follow-Up Proof**.
- Next loop action: `/paul:plan` for Phase 41.
