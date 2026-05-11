---
phase: 45-pi-api-and-documentation-delta-audit
plan: 02
type: fix
completed: 2026-05-11
result: PARTIAL
---

## Fix Summary

**Issue:** CI on PR #1 (`Verify release baseline`) was failing on Node 20.20.2
with `TypeError [ERR_UNKNOWN_FILE_EXTENSION]: Unknown file extension ".ts"`
because the repo's verification scripts call `node --test test/*.test.ts`
directly, and Node's native TypeScript loader is only available from Node 22.6+
(stable in Node 22 LTS).

**Mode:** Standard fix (PALS /paul:fix side loop). FIX.md authored at
`.paul/phases/45-pi-api-and-documentation-delta-audit/45-02-FIX.md`.

**Result:** PARTIAL.
The original blocker (zero tests executable on the Actions runner) was
resolved by bumping the workflow's Node version. After the change, CI
now actually runs the suite — **207 tests execute, 181 pass, 26 fail** —
versus 0/0 before. All 26 remaining failures are pre-existing CI
environment/fixture gaps that were masked by the `.ts` extension error,
not regressions introduced by this fix or by Phase 45 APPLY. They are
explicitly out of scope for FIX 45-02; the user should choose how to
sequence the follow-on work (see Decision Needed below).

### Files Changed

| File | Change |
|------|--------|
| `.github/workflows/ci.yml` | `node-version: 20` → `node-version: 22` (single-line edit; `cache: npm` and all other steps unchanged) |
| `.paul/phases/45-pi-api-and-documentation-delta-audit/45-02-FIX.md` | New FIX artifact (this fix's plan) |

### Verification

| Check | Result |
|---|---|
| `grep -nE 'node-version:' .github/workflows/ci.yml` shows `node-version: 22` | PASS (line 19) |
| `npm run build` passes locally | PASS (0 units compiled) |
| CI on PR #1 now executes the test suite (was 0 tests on Node 20) | PASS — 207 tests run after fix |
| `Verify release baseline` reports SUCCESS on PR #1 | FAIL — 26/207 fail due to pre-existing fixture/env gaps |

### Result

The Node version bump itself works as intended and is the right change:

- Local dev runs Node 25.9.0 (native `.ts` works).
- Pi itself targets Node ≥22 LTS.
- The repo's test scripts assume native `.ts` loading.

The fix unblocked the `.ts`-extension blocker and surfaced a separate
class of CI environment gap.

### Newly visible CI failures (out of FIX 45-02 scope)

The 26 failures partition cleanly into three pre-existing CI-environment
issues:

1. **Eval fixture files not checked in (~16 failures).**
   `.gitignore:8 .pi/` ignores all of `.pi/`. Some files (e.g.
   `.pi/evals/ptc/cases/*.json`) were `git add -f`'d, but
   `.pi/evals/ptc/baselines/local__seeded__recipes.json` and
   `.pi/evals/ptc/recipes/*.py` were never force-added, so they exist
   locally but not on the runner. Tests that read them fail with
   `ENOENT`. This is a repo-hygiene gap that predates Phase 45.
2. **`pi-hashline-readmap` package not installed on CI (~6 failures).**
   Hashline contract tests guard with
   `Could not locate pi-hashline-readmap. Set PI_HASHLINE_READMAP_ROOT
   or install the package before running hashline contract tests.`
   The guard is intentional; the runner just has neither the package
   nor the env var. Locally it resolves via
   `/Users/.../pi/workspace/pi-hashline-readmap`.
3. **`ast-grep` (`sg`) not on CI PATH (~1 failure).**
   `hashline-real-interop.test.ts` requires `sg` to be installed.
   Locally it resolves to `/opt/homebrew/bin/sg`.

All three predate Phase 45 — none touch `src/**`, `test/**`,
`package.json`, or any artifact this milestone introduced. Phase 45's
audit itself flagged Phase 48 (proof / release-readiness) as the right
home for CI/release proof work; the right disposition is either to
treat (1) as a small follow-on standard fix and (2)+(3) as either
skip-on-missing guards or CI-install steps, sequenced as part of
Phase 48 or as further `/paul:fix` loops.

### Module Execution Reports

- `[dispatch] post-apply: WALT — PASS — local `npm run build` clean; CI now executes the test suite (was 0/0 before, 181/207 after).`
- `[dispatch] post-apply: DAVE — INFO — single workflow line changed; runner Node version bumped from 20 to 22 (LTS, native `.ts` loader).`
- `[dispatch] post-apply: SETH — PASS — no executable code or dependencies modified.`
- `[dispatch] post-apply: IRIS — PASS — single-line CI tweak, no markers.`
- `[dispatch] post-apply: DOCS — PASS — no product docs touched.`
- `[dispatch] post-apply: TODD — INFO — CI test suite now actually runs 207 tests, revealing 26 pre-existing fixture/env gaps masked by the `.ts` extension error. Out of FIX 45-02 scope; recorded for next decision.`
- `[dispatch] post-unify: IRIS — PASS — FIX summary records bounded outcome and explicit out-of-scope newly-visible failures.`
- `[dispatch] post-unify: DOCS — PASS — only `.paul/*` and `.github/workflows/ci.yml` touched.`
- `[dispatch] post-unify: SKIP — PASS — knowledge captured: CI Node version was the gating issue; remaining 26 failures partition into 3 pre-existing CI-env classes for Phase 48 / follow-on `/paul:fix` triage.`

### Decision Needed

The merge gate for PR #1 is still red (`require_pr_before_next_phase:
true`). Choose one:

- **(A) Follow-on `/paul:fix` standard** — force-add the missing eval
  baseline + recipes (~16 failures), add `pi-hashline-readmap` install
  or `PI_HASHLINE_READMAP_ROOT` skip guard to the workflow (~6), and
  install `ast-grep` on CI (~1). One bounded follow-on fix, then merge.
- **(B) Defer to Phase 48** — open Phase 46 anyway by temporarily
  toggling `require_pr_before_next_phase: false` in `pals.json`,
  leaving PR #1 open, and folding the CI-env repair into Phase 48
  (proof / release-readiness, recommendation 48-B).
- **(C) Stop here** — accept Phase 45 with PR #1 open; revisit before
  any release activity.

This SUMMARY records the bounded outcome; the routing decision is the
user's.
