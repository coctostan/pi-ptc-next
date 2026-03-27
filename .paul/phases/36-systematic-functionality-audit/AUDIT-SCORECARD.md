# Phase 36 Audit Scorecard — Systematic Functionality Audit

**Date:** 2026-03-26
**Test files:** `test/live-audit-helpers.test.ts` (21 tests), `test/live-audit-pipeline.test.ts` (8 tests)
**Results:** 29/29 passing (including 3 documented-bug tests)
**Full suite:** 182 total / 181 passing / 1 pre-existing failure

## Overall Assessment

The pi-ptc-next Python helper surface is **broadly functional**. 18 of 21 helpers work correctly through the real Python runtime with stub tools. Three helpers (`ptc.find_files`, `ptc.find_files_abs`, `ptc.read_tree`) share a common bug where the internal `glob()` wrapper doesn't accept the `limit` keyword argument that `find_files()` passes to it. The execution pipeline (RPC bridge, ptcValue passthrough, error handling) works well with one notable quirk around syntax error reporting.

## Helper Scorecard

| # | Capability | Category | Status | Evidence | Notes |
|---|-----------|----------|--------|----------|-------|
| 1 | `read()` | Core wrapper | ✅ Working | Returns file content, type checks pass | Needs `await` |
| 2 | `grep()` | Core wrapper | ✅ Working | Returns matches with keyword args | **Keyword-only args** — `grep(pattern="x", path=".")` not `grep("x", path=".")` |
| 3 | `find()` | Core wrapper | ✅ Working | Returns file path list | Needs `await` |
| 4 | `ls()` | Core wrapper | ✅ Working | Returns directory entries | Needs `await` |
| 5 | `glob()` | Core wrapper | ✅ Working | Returns matched paths | Needs `await`; does NOT accept `limit` kwarg |
| 6 | `ptc.read_many()` | Batch helper | ✅ Working | Returns list of 2 strings for 2 paths | Needs `await` |
| 7 | `ptc.read_tree()` | Batch helper | ❌ Broken | `glob() got an unexpected keyword argument 'limit'` | Internally calls `find_files → glob(limit=...)` which fails |
| 8 | `ptc.find_files()` | Batch helper | ❌ Broken | `glob() got an unexpected keyword argument 'limit'` | Calls `glob(limit=max_files)` but glob wrapper rejects `limit` |
| 9 | `ptc.find_files_abs()` | Batch helper | ❌ Broken | `glob() got an unexpected keyword argument 'limit'` | Calls `find_files → glob(limit=...)` — same root cause |
| 10 | `ptc.read_text()` | Batch helper | ✅ Working | Returns str type, content non-empty | Needs `await` |
| 11 | `ptc.gather_limit()` | Batch helper | ✅ Working | Returns list of 2 results with limit=2 | Correctly bounds concurrency |
| 12 | `ptc.batch_tool()` | Orchestration | ✅ Working | Returns list of 2 tool results | Works with call-spec dicts |
| 13 | `ptc.first_success()` | Orchestration | ✅ Working | Falls back to second call when first fails | Ordered sequential fallback confirmed |
| 14 | `ptc.reduce_tool()` | Orchestration | ✅ Working | Accumulates across 2 calls with lambda reducer | Lambda passed as Python code |
| 15 | `ptc.fit_output()` | Output helper | ✅ Working | Returns `{kind: "fit_output", truncated: true}` | Correctly truncates large data |
| 16 | `ptc.expect_kind()` | Assertion | ✅ Working | Passes for dict with matching kind field | Requires `kind` field in input dict — raw strings fail with clear error |
| 17 | `ptc.json_dump()` | Output helper | ✅ Working | Serializes dict to valid JSON string | Pure utility, no RPC needed |
| 18 | `ptc.list_callable_tools()` | Introspection | ✅ Working | Returns list of dicts with `name` keys | Lists all registered tools |
| 19 | `ptc.get_tool_schema()` | Introspection | ✅ Working | Returns dict with tool schema content | Top-level keys depend on tool registration; no guaranteed `name` field |
| 20 | `ptc.extract_handles()` | Handle helper | ✅ Working | Returns list (may be empty if no handles found) | Works with stub web_search returning ptcValue |
| 21 | `ptc.first_handle()` | Handle helper | ✅ Working | Returns handle or None | Graceful None for missing handles |

## Pipeline Scorecard

| # | Capability | Status | Evidence | Notes |
|---|-----------|--------|----------|-------|
| 1 | RPC round-trip (pure Python) | ✅ Working | `return "hello"` → output received | ~50ms per execution |
| 2 | RPC round-trip (with tool call) | ✅ Working | `read()` call and return verified | Tool stub responses pass through correctly |
| 3 | ptcValue structured passthrough | ✅ Working | `structured_tool` returns kind/score/items intact | Full structured dict preserved across RPC boundary |
| 4 | Syntax error handling | ⚠️ Partial | Caught as "RPC stdout closed" not "SyntaxError" | Python subprocess crashes on syntax errors; error IS caught but message is generic |
| 5 | Runtime exception handling | ✅ Working | `raise ValueError(...)` message surfaces cleanly | Exception message preserved in PtcPythonError |
| 6 | Division by zero handling | ✅ Working | `ZeroDivisionError` surfaces | Standard Python exceptions work |
| 7 | Output truncation | ⚠️ Partial | 5000-char output bounded to ~258 chars at max=200 | Truncation works but adds ~50-60 chars of overhead above the stated limit |
| 8 | asyncio.run() rejection | ✅ Working | Rejected pre-execution with clear message | Fast-path check before subprocess spawn |

## Summary Statistics

| Metric | Value |
|--------|-------|
| Helpers working | 18 / 21 (86%) |
| Helpers broken | 3 / 21 (14%) |
| Pipeline working | 6 / 8 (75%) |
| Pipeline partial | 2 / 8 (25%) |
| Total capabilities | 29 |
| Total working | 24 (83%) |
| Total partial | 2 (7%) |
| Total broken | 3 (10%) |

## Gap Analysis

### Critical Bug: `glob()` missing `limit` parameter
- **Affected helpers:** `ptc.find_files()`, `ptc.find_files_abs()`, `ptc.read_tree()`
- **Root cause:** The Python `glob()` wrapper is generated without a `limit` keyword argument, but `ptc.find_files()` at line 749 of runtime.py calls `glob(pattern=..., path=..., limit=max_files)`
- **Impact:** Three helpers are completely unusable. These are core file-discovery helpers that models rely on for repo-wide analysis.
- **Fix:** Either add `limit` to the `glob()` wrapper signature, or have `find_files()` call `glob()` without `limit` and slice the result.

### Minor: Syntax error reporting
- **Issue:** Python syntax errors crash the subprocess, surfacing as generic "RPC stdout closed" rather than a structured `PtcPythonError` with the actual `SyntaxError` traceback.
- **Impact:** Low — errors are still caught and execution doesn't hang. But model-facing error messages are less helpful for debugging.

### Minor: Output truncation overhead
- **Issue:** `maxOutputChars=200` produces output of ~258 chars. There's ~50-60 chars of overhead from framing/metadata.
- **Impact:** Low — truncation is functional. Models should just be aware the effective limit is slightly above the stated cap.

### Observation: All core wrappers need `await`
- `read()`, `grep()`, `find()`, `ls()`, `glob()` are all async. Forgetting `await` gives a confusing "object of type 'coroutine' has no len()" error.
- The `code_execution` tool description already documents this, but it's a common footgun.

### Observation: `grep()` takes keyword-only args
- `grep("pattern", path=".")` fails — must be `grep(pattern="pattern", path=".")`.
- This differs from the tool description which shows positional-style examples.

## Recommendations for Phase 37 (Stress Testing)

1. **Fix the `glob()` / `limit` bug first** — it blocks three helpers. Then stress-test `find_files` and `read_tree` with large repos.
2. **Concurrency stress:** Push `ptc.batch_tool()` and `ptc.gather_limit()` with 10+ parallel calls to test RPC throughput.
3. **Large file stress:** Read files >500 lines through `read()` and `ptc.read_many()`.
4. **Output budget stress:** Push `ptc.fit_output()` with deeply nested structures and near-limit output sizes.
5. **Error recovery stress:** Chain multiple failing tool calls to test error accumulation and cleanup.
6. **Missing tool handling:** Call `ptc.get_tool_schema("nonexistent_tool")` and `ptc.batch_tool` with invalid tool names.

---

*Scorecard generated from live test execution on 2026-03-26*
