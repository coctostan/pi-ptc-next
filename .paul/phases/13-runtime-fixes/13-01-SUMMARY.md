---
phase: 13-runtime-fixes
plan: 01
completed: 2026-03-19T10:00:00Z
duration: ~5 minutes
---

## Objective
Fix the two runtime-level findings: E9 (RPC buffer overflow causing 270s hangs on files >~250 lines) and E8 (grep returning absolute paths with hashline bridge active).

## What Was Built
| File | Purpose | Lines changed |
|------|---------|---------------|
| `src/python-runtime/rpc.py` | Increased `asyncio.StreamReader` limit from 64KB to 4MB (E9) | 1 |
| `src/python-runtime/runtime.py` | Added `_relativize_path()`, `_normalize_grep_result()`, and grep post-process wrapper (E8) | +25 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | RPC buffer handles large structured ReadResult | PASS (code) | `asyncio.StreamReader(limit=4 * 1024 * 1024)` at rpc.py L39. Live verification deferred to Phase 14 (requires session restart). |
| AC-2 | grep record paths workspace-relative | PASS (code) | `_relativize_path()` + `_normalize_grep_result()` + grep wrapper in runtime.py. Live verification deferred to Phase 14. |
| AC-3 | Existing behavior preserved | PASS | npm test: 73/73 pass. `_extract_text()` and `_PtcHelpers` untouched. |

## Verification Results
```text
$ npm run build
✓ Build successful

$ npm test
ℹ tests 73
ℹ pass 73
ℹ fail 0

StreamReader limit: 4 * 1024 * 1024 ✓
_relativize_path: 2 occurrences ✓
_normalize_grep_result: 2 occurrences ✓
_generated_grep wrapper: 3 occurrences ✓
_extract_text preserved: 3 occurrences ✓
```

## Deviations
- None. Both tasks applied as planned.

## Key Patterns / Decisions
- 4MB StreamReader limit provides ~50x headroom over the previous 64KB default — handles files up to ~800KB of structured JSON.
- The grep wrapper captures the generated `grep()` at module load time via `globals().get("grep")` and replaces it with a normalizing version. This works because runtime.py loads after the generated wrappers.
- `_relativize_path()` is a no-op for paths already relative, so the normalization is safe regardless of bridge state.

## Next Phase
Phase 13 complete. Next: `/paul:plan` for Phase 14 — Model Guidance and Verification.
