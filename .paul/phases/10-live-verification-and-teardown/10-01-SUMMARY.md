---
phase: 10-live-verification-and-teardown
plan: 01
completed: 2026-03-18T17:00:00Z
duration: ~10 minutes (including session restart)
---

## Objective
Confirm that structured `ptcValue` payloads flow through `code_execution` nested tool calls in a live pi session, and verify bridge teardown markers.

## What Was Built
No files modified — this was verification only.

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | read() inside code_execution returns structured ReadResult | PASS | Live `read(path="src/index.ts", limit=3)` returned a dict with keys `tool, path, range, warnings, truncation, symbol, map, lines`. First line had keys `line, hash, anchor, raw, display`. |
| AC-2 | grep() inside code_execution returns structured GrepResult | PASS | Live `grep(pattern="export class", path="src")` returned a dict with keys `tool, summary, totalMatches, records`. First record had keys `path, line, hash, anchor, kind, raw, display`. totalMatches=11. |
| AC-3 | Bridge teardown markers documented | PASS | `"hashline:tool-executors"` grep marker found in `src/tool-registry.ts` (L101, L106) and `pi-hashline-readmap/index.ts` (L40). `"Remove when pi exposes getToolExecutor()"` found at L100 and L207 in tool-registry.ts. `__hashlineToolExecutors` stash at `pi-hashline-readmap/index.ts` L39. |

## Verification Results
```text
Live code_execution — read():
  type: dict ✓
  is_dict: true ✓
  has_lines: true ✓
  first_line_keys: [line, hash, anchor, raw, display] ✓

Live code_execution — grep():
  type: dict ✓
  is_dict: true ✓
  has_records: true ✓
  totalMatches: 11 ✓
  first_record_keys: [path, line, hash, anchor, kind, raw, display] ✓

Teardown markers:
  PTC: src/tool-registry.ts L100, L101, L106, L207 ✓
  Hashline: index.ts L39, L40 ✓
```

## Deviations
- None. Verification-only phase completed as planned.
- Required one session restart for the bridge to activate (expected — extensions load at init).

## Key Patterns / Decisions
- The `globalThis.__hashlineToolExecutors` path is the primary discovery mechanism. Hashline loads before PTC, so the stash is always available by the time PTC's constructor runs.
- Structured `ReadResult` and `GrepResult` payloads now flow through `code_execution` exactly as they do when the agent uses the top-level `Read`/`Grep` tools directly. The split-brain behavior is eliminated.
- Bridge teardown is straightforward: grep for `"hashline:tool-executors"` in both repos.

## Next Phase
Phase 10 is complete. Milestone 4 is fully done — all 3 phases complete. Ready for milestone completion.
