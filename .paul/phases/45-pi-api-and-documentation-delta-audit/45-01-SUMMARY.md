---
phase: 45-pi-api-and-documentation-delta-audit
plan: 01
artifact: SUMMARY
created: 2026-05-11
type: research
result: PASS
---

# Plan 45-01 Summary — Pi API and Documentation Delta Audit

## Objective and Result

**Objective:** Produce an audit-only compatibility delta between
`pi-ptc-advanced` and Pi (installed local + latest published) covering
extension API usage, tool metadata, callable-tool execution, and
system-prompt / tool-guidance integration.

**Result:** PASS. The audit artifact
`.paul/phases/45-pi-api-and-documentation-delta-audit/45-01-PI-COMPAT-AUDIT.md`
(271 lines) was produced. Evidence baseline, 18-row compatibility matrix,
6 prompt-integration findings, and Phase 46/47/48 remediation handoff
were all delivered. Human-verify checkpoint approved by user.

## Files Changed

- `.paul/phases/45-pi-api-and-documentation-delta-audit/45-01-PI-COMPAT-AUDIT.md`
  — new audit artifact (planned, only file modified).

Working tree at finalize-time was clean other than the lifecycle artifacts
this UNIFY step writes (STATE.md, ROADMAP.md, 45-01-SUMMARY.md).

## Acceptance Criteria Results

| AC | Description | Result | Evidence |
|---|---|---|---|
| AC-1 | Evidence-based Pi version baseline (local + latest) | PASS | `45-01-PI-COMPAT-AUDIT.md` §1.1 (`@earendil-works/pi-coding-agent@0.74.0` installed at `/opt/homebrew/lib/node_modules/...`), §1.2 (`npm view` → `version: 0.74.0`, `latest: 0.74.0`, published 2026-05-07; local equals latest), §1.3 (project peer `@mariozechner/pi-coding-agent@0.55.1`). |
| AC-2 | Extension API compatibility matrix with statuses + evidence | PASS | `45-01-PI-COMPAT-AUDIT.md` §2 — 18 rows (M-1…M-18); statuses: `compatible` (M-2, M-5, M-7, M-11, M-16, M-17), `upgrade-candidate` (M-3, M-4, M-12), `risk` (M-1, M-6, M-13, M-15), `defer` (M-8, M-9, M-10, M-14), `compatible-but-coupled` (M-18). All rows cite project file:line plus latest Pi `docs/extensions.md` / `types.d.ts` / `CHANGELOG.md` evidence. |
| AC-3 | System prompt and tool guidance findings (Phase 47-ready) | PASS | `45-01-PI-COMPAT-AUDIT.md` §3 — current prompt-integration surface (§3.1), 6 findings P-1…P-6 (§3.2), explicit non-findings (§3.3). Top finding: `code_execution` lacks `promptSnippet` / `promptGuidelines` so it is omitted from the default system prompt's "Available tools" section. |
| AC-4 | Bounded remediation handoff (Phase 46 / 47 / 48 + deferrals) | PASS | `45-01-PI-COMPAT-AUDIT.md` §4 — Phase 46 (4 items: scope, context-cast, bridge visibility, sourceInfo strategy), Phase 47 (5 items: promptSnippet, promptGuidelines, systemPromptOptions, CustomToolManager passthrough, maintainer docs), Phase 48 (3 items: regression test, packaging sanity, release notes), 6 explicit deferrals (D-1…D-6). Each row has rationale, expected files, and verification strategy. |

## Task / Verification Results

| # | Task | Type | Verify command (from PLAN) | Result |
|---|---|---|---|---|
| 1 | Build local/latest Pi evidence baseline | auto | `test -f … && grep -n "Local Pi baseline\|Latest published baseline\|Evidence" …` | PASS (file exists; matched lines 19, 87, 263) |
| 2 | Audit extension API and runtime compatibility | auto | `grep -n "Compatibility Matrix\|promptSnippet\|systemPromptOptions\|getAllTools\|@mariozechner" …` | PASS (97 matrix marker + multi-row hits) |
| 3 | Produce prioritized remediation and proof handoff | auto | `grep -n "Phase 46 Runtime\|Phase 47 Prompt\|Phase 48 Proof\|Deferrals" …` | PASS (all four headings present at lines 201, 210, 220, 228 after one heading touch-up during APPLY) |
| 4 | checkpoint:human-verify | checkpoint | user approval | PASS — user replied "approved" |

Full-build verification:

- `npm run build` → PASS (0 units compiled).
- `git diff --name-status` plus untracked listing → only the planned
  artifact `.paul/phases/45-pi-api-and-documentation-delta-audit/45-01-PI-COMPAT-AUDIT.md`
  showed up before APPLY commit.

## Deviations and Decisions

1. **Heading text touch-up during APPLY.** Task 3's verify regex
   (`Phase 46 Runtime|Phase 47 Prompt|Phase 48 Proof|Deferrals`) initially
   missed because subsection headings used em-dash separators. Heading
   text was normalised to plain words (`§4.1 Phase 46 Runtime alignment
   candidates`, `§4.2 Phase 47 Prompt and tool-guidance candidates`,
   `§4.3 Phase 48 Proof and release-readiness candidates`, `§4.4
   Deferrals and explicit risks`) so the planned verify regex passes.
   No content semantic change. Recorded as a within-task fix, not a
   plan-scope deviation.
2. **GitHub Flow postflight executed during APPLY (per `pals.json`).**
   APPLY committed `6fef3f4 docs(phase-45): pi compat audit (45-01)`,
   pushed `feat/hashline-native-interop`, and opened
   [PR #1](https://github.com/coctostan/pi-ptc-next/pull/1) against
   `main`. Plan boundaries were respected — the commit only touches the
   single planned audit artifact.
3. **CI failure on the new PR is pre-existing, not Phase 45 regression.**
   `Verify release baseline` on the Actions runner fails with
   `ERR_UNKNOWN_FILE_EXTENSION: Unknown file extension ".ts"` while
   running `node --test test/*.test.ts` on Node 20.20.2. Phase 45 made
   zero changes to `test/**`, `src/**`, `package.json`, or
   `.github/workflows/**`. Local `npm run build` is green and prior
   baseline was 207 pass / 0 fail. Treated as an Actions-environment
   issue, surfaced for Phase 48 (release/proof) or a `/paul:fix` loop —
   **not** a blocker for this phase's reconciliation.
4. **DEAN baseline overridden upstream of this plan.** User approved
   the dependency-audit override at planning time. `.paul/dean-baseline.json`
   carries the override; APPLY made no dependency changes.

## Checkpoint Decisions

- `checkpoint:human-verify` (after Task 3): user replied "approved";
  audit content accepted, no rework requested.

## Boundaries Honored

- No `src/**/*.ts` runtime files touched.
- No `package.json` / `package-lock.json` changes.
- No release scripts, CI workflows, or installed Pi files touched.
- DEAN baseline untouched.
- Only the planned audit artifact was added to the commit.

## Lessons Learned

- When a plan's `<verify>` block uses literal regex tokens, prefer
  plain heading text over typographically nice em-dashes in the matching
  document. This avoids the small Task-3 heading touch-up that happened
  here.
- Treating "local installed Pi equals latest published Pi" as the
  executable latest baseline (per plan boundaries) kept the audit
  cheap and reproducible without external doc fetching.
- The `@mariozechner/*` → `@earendil-works/*` scope rename is the
  largest structural shift since the project's last compatibility
  review, and it gates several other risk rows. Capturing it as a
  named finding (R-1) up front made the Phase 46 handoff coherent.
- CI/Actions runner health is a separate concern from in-repo
  correctness. Pi 0.74.0 ships TypeScript-source loaders, but the
  CI workflow assumes a Node version with `.ts` support; reconciling
  that gap should be tracked explicitly in Phase 48 or via `/paul:fix`.

## Next Phase Note

Phase 45 produced an audit-only artifact. Phase 46 is the natural
runtime-alignment follow-on (recommendations 46-A…46-D). Phase 47 is
prompt/tool-guidance (47-A…47-E). Phase 48 is proof / release (48-A…48-C).
Order is intentional: 46-A (peer scope) is the gating decision and should
be sequenced first.

## Module Execution Reports

### Pre-apply / Post-apply dispatches (recorded during APPLY)

- `[dispatch] pre-apply: SKIPPED — audit-only research phase; advisories recorded in PLAN <module_dispatch>.`
- `[dispatch] post-apply advisory: TODD — SKIPPED — research phase; PLAN required content checks; all task <verify> grep checks PASS.`
- `[dispatch] post-apply advisory: IRIS — PASS — audit artifact contains no TODO/FIXME/HACK/XXX markers (intentional findings only).`
- `[dispatch] post-apply advisory: DOCS — PASS — only the planned `.paul/phases/45...` audit artifact was written.`
- `[dispatch] post-apply advisory: RUBY — PASS — no growth in known hotspots (`runtime.py`, `README.md`, `src/index.ts`, `test/index.test.ts`).`
- `[dispatch] post-apply advisory: CODI — SKIPPED — no source identifiers introduced or modified.`
- `[dispatch] post-apply enforcement: WALT — PASS — `npm run build` exit 0; planned `<verify>` grep checks all PASS; no scope drift.`
- `[dispatch] post-apply enforcement: DAVE — SKIPPED — no CI/deploy workflow changes.`
- `[dispatch] post-apply enforcement: SETH — SKIPPED — no executable code, dependencies, or secrets touched.`
- `[dispatch] post-apply enforcement: DEAN — DEFERRED — user-approved baseline at `.paul/dean-baseline.json` (30-day window); audit-only phase made no dependency changes.`

### Pre-unify dispatch

- `[dispatch] pre-unify: 0 modules registered for this hook (audit-only research artifact; no pre-unify hooks in installed modules.yaml apply).`

### Post-unify dispatch

- `[dispatch] post-unify: IRIS — PASS — SUMMARY carries no introduced TODO/FIXME markers; deviations are explicit and bounded.`
- `[dispatch] post-unify: DOCS — PASS — only `.paul/*` lifecycle files updated (STATE.md, ROADMAP.md, 45-01-SUMMARY.md); no product docs drift.`
- `[dispatch] post-unify: RUBY — PASS — hotspot files (`runtime.py`, `README.md`, `src/index.ts`, `test/index.test.ts`) untouched.`
- `[dispatch] post-unify: SKIP — PASS — SUMMARY records knowledge: R-1 / R-2 / R-3 findings, CI-runner caveat, and Phase 46/47/48 sequencing.`
- `[dispatch] post-unify: WALT — PASS — quality baseline holds (`npm run build` clean during APPLY; prior `npm test` baseline 207/0 unchanged because no source/test code was modified).`
- `[dispatch] post-unify: DEAN — DEFERRED — pre-existing baseline `.paul/dean-baseline.json` still authoritative; nothing in this plan invalidates it.`

### Quality history snapshot (post-unify)

- Build: `npm run build` → PASS (0 units compiled) during APPLY.
- Tests: not re-run during APPLY because no source/test files changed
  (last known full-suite baseline: 207 pass / 0 fail after Phase 41).
- CI on PR #1: FAILURE due to a pre-existing GitHub Actions Node
  20.20.2 `.ts` runner issue; flagged for Phase 48 / `/paul:fix`.
- Scope drift: none — single planned artifact present.
