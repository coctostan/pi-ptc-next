---
phase: 11-runtime-helper-normalization
plan: 01
completed: 2026-03-18T17:20:00Z
duration: ~5 minutes
---

## Objective
Fix `ptc.read_text()`, `ptc.read_many()`, and `ptc.read_tree()` so they return strings as documented, normalizing structured `ReadResult` dicts when the hashline bridge is active.

## What Was Built
| File | Purpose | Lines changed |
|------|---------|---------------|
| `src/python-runtime/runtime.py` | Added `_extract_text()` helper, applied in `read_text()` and `read_many()` | +10, ~4 modified |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | ptc.read_text() returns str | PASS | Live: `type=str`, `is_str=true`, `has_newlines=true` |
| AC-2 | ptc.read_many() returns list[str] | PASS | Live: `all_str=true`, both elements are str |
| AC-3 | ptc.read_tree() content is str | PASS | Live: `content_type=str`, `split_works=true`, `count_works=true` |
| AC-4 | read() unchanged — still Union[str, ReadResult] | PASS | Live: `type=dict`, `is_dict=true`, `has_lines=true` |

## Verification Results
```text
$ npm test
ℹ tests 73
ℹ pass 73
ℹ fail 0

Live in-session verification:
  ptc.read_text("src/types.ts") → str ✓
  ptc.read_many(["src/types.ts", "src/utils.ts"]) → [str, str] ✓
  ptc.read_tree(pattern="settings.ts", path="src/contracts") → content is str ✓
  read(path="src/index.ts", limit=3) → dict with lines ✓
```

## Deviations
- None. Single-file change as planned.

## Key Patterns / Decisions
- `_extract_text()` handles three cases: str passthrough, dict with `lines` (joins `raw` fields), and fallback `str()`.
- `read_tree()` needed no change — it calls `read_many()` which now normalizes via `_extract_text()`.
- `read()` remains `Union[str, ReadResult]` — models that want structured data call `read()` directly; helpers that want strings use `ptc.read_text()` / `ptc.read_many()` / `ptc.read_tree()`.

## Next Phase
Phase 11 complete. Next: `/paul:plan` for Phase 12 — Model Guidance and Live Verification.
