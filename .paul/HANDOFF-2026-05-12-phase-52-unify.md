# PAUL Handoff

status: paused
created: 2026-05-12T19:18:00Z
phase: 52 of 53 — Callable-Tool Introspection
plan: `.paul/phases/52-callable-tool-introspection/52-01-PLAN.md` — APPLY complete, UNIFY pending
loop: PLAN ✓ / APPLY ✓ / UNIFY ○
state_authority: .paul/STATE.md
resume_action: `/paul:unify .paul/phases/52-callable-tool-introspection/52-01-PLAN.md`
wip_result: committed and pushed (`9601383`, `578b3ef`, `ca55153`)

git_snapshot:
  workflow: github-flow
  branch: feature/52-callable-tool-introspection
  base: main
  pr: https://github.com/coctostan/pi-ptc-next/pull/8 — OPEN, mergeStateStatus CLEAN
  ci: passing — GitHub Actions Verify release baseline SUCCESS; Socket checks SUCCESS
  sync: branch ahead origin/main by 3 commits, behind 0
  note: snapshot only; resume rechecks live git state before merge-gate routing

progress:
  done:
    - Phase 52 PLAN created at `.paul/phases/52-callable-tool-introspection/52-01-PLAN.md`.
    - APPLY implemented optional `promptSnippet` / `promptGuidelines` propagation into Python callable-tool metadata.
    - APPLY added `ptc.help(tool_name)` with canonical-name and Python-alias lookup while preserving `ptc.get_tool_schema(...)` as schema-only.
    - README, generated `code_execution` prompt guidance, CHANGELOG, and tests updated.
    - Verification passed: focused Phase 52 tests, `npm test` 230 passing / 0 failing, `npm run build`, and `npm audit --json` at 0 critical / 0 high / 3 moderate.
    - PR #8 opened and checks passed.
  in_progress:
    - UNIFY not yet run; `52-01-SUMMARY.md` has not been created.
  blockers:
    - None known.
  decisions:
    - `ptc.help(tool_name)` should include the full `parameters` schema so it is a one-stop “what is this tool and how do I call it?” helper.
    - Python `CallableToolMetadata(TypedDict, total=False)` is acceptable for optional prompt fields; required keys remain emitted by generated metadata.

files:
  - path: `.paul/phases/52-callable-tool-introspection/52-01-PLAN.md`
    reason: Approved plan to reconcile during UNIFY.
  - path: `.paul/STATE.md`
    reason: Source of truth for PLAN/APPLY/UNIFY position and resume routing.
  - path: `.paul/ROADMAP.md`
    reason: Phase 52 currently marked APPLY complete; UNIFY should mark complete and transition to Phase 53 after merge gate.
  - path: `src/tools/python-tool-contract.ts`
    reason: Metadata propagation implementation.
  - path: `src/tools/tool-wrapper.ts`
    reason: Python `CallableToolMetadata` TypedDict update.
  - path: `src/python-runtime/runtime.py`
    reason: Runtime `ptc.help(...)` helper.
  - path: `test/callable-tool-introspection-helper.test.ts`
    reason: Main runtime proof for prompt metadata and help helper.
  - path: `README.md`, `src/index.ts`, `CHANGELOG.md`
    reason: User-facing and generated prompt guidance updates.

handoff_lifecycle:
  prior_active: none
  note: archived handoffs are history; STATE remains source of truth

resume:
  command: /paul:resume
  expected_next: `/paul:unify .paul/phases/52-callable-tool-introspection/52-01-PLAN.md`
