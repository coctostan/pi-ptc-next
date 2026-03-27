# pi-ptc-next — Final Audit Report (Milestone 14)

**Date:** 2026-03-26
**Milestone:** 14 — Live Tool Audit and Stress Testing
**Phases:** 36 (functionality), 37 (stress), 38 (composition)
**Total tests added:** 51 (21 helper + 8 pipeline + 15 stress + 7 composition)
**Full suite:** 204 total / 203 passing / 1 pre-existing failure

## Executive Summary

pi-ptc-next's Python helper surface is **broadly functional and production-usable**. Of 51 test scenarios across individual helpers, stress conditions, and multi-step composition workflows, **48 pass cleanly (94%)** and **3 document a single shared bug** (glob missing `limit` kwarg). The RPC bridge, ptcValue structured passthrough, concurrency controls, output budget fitting, and multi-tool composition all work correctly. The extension is ready for real-world use with one critical fix needed.

**Verdict: Ship-ready with one P0 fix.**

## Full Capability Matrix

### Core Wrappers (5)
| Capability | Status | Notes |
|-----------|--------|-------|
| `read()` | ✅ Working | Handles 1000+ line files cleanly. Needs `await`. |
| `grep()` | ✅ Working | Keyword-only args: `grep(pattern=..., path=...)`. Needs `await`. |
| `find()` | ✅ Working | Returns file path list. Needs `await`. |
| `ls()` | ✅ Working | Returns directory entries. Needs `await`. |
| `glob()` | ✅ Working | Does NOT accept `limit` kwarg — root cause of find_files bug. |

### Batch/File Helpers (6)
| Capability | Status | Notes |
|-----------|--------|-------|
| `ptc.read_many()` | ✅ Working | Handles 5×500-line batch, empty list returns []. |
| `ptc.read_tree()` | ❌ Broken | Calls find_files → glob(limit=...) which fails. |
| `ptc.find_files()` | ❌ Broken | Calls glob(limit=max_files) — glob rejects `limit`. |
| `ptc.find_files_abs()` | ❌ Broken | Calls find_files — same root cause. |
| `ptc.read_text()` | ✅ Working | Returns str, content correct. |
| `ptc.gather_limit()` | ✅ Working | Concurrency bounded correctly at limit=3 with 8 coros. |

### Orchestration Helpers (3)
| Capability | Status | Notes |
|-----------|--------|-------|
| `ptc.batch_tool()` | ✅ Working | 10 parallel calls clean. Fails fast on errors (no partial results). Rejects empty lists. |
| `ptc.first_success()` | ✅ Working | Falls back through 3 failures to 4th success. Sequential order confirmed. |
| `ptc.reduce_tool()` | ✅ Working | Accumulates across calls. Propagates first failure. |

### Output/Assertion Helpers (3)
| Capability | Status | Notes |
|-----------|--------|-------|
| `ptc.fit_output()` | ✅ Working | Deep nesting (8 levels), aggressive truncation (max_chars=100), all clean. |
| `ptc.expect_kind()` | ✅ Working | Requires dict with `kind` field. Wrong kind raises clear ValueError. |
| `ptc.json_dump()` | ✅ Working | Pure utility, serializes to valid JSON. |

### Introspection Helpers (2)
| Capability | Status | Notes |
|-----------|--------|-------|
| `ptc.list_callable_tools()` | ✅ Working | Returns all registered tools with names. |
| `ptc.get_tool_schema()` | ✅ Working | Returns schema dict. Empty dict for unknown tools (no crash). |

### Handle Helpers (2)
| Capability | Status | Notes |
|-----------|--------|-------|
| `ptc.extract_handles()` | ✅ Working | Extracts handles from ptcValue results. |
| `ptc.first_handle()` | ✅ Working | Returns first matching handle or None. |

### Pipeline (8)
| Capability | Status | Notes |
|-----------|--------|-------|
| RPC round-trip (pure Python) | ✅ Working | ~50ms per execution |
| RPC round-trip (with tool call) | ✅ Working | Tool responses pass through correctly |
| ptcValue structured passthrough | ✅ Working | Full structured dict preserved across RPC |
| Syntax error handling | ⚠️ Partial | Caught as "RPC stdout closed" — functional but generic message |
| Runtime exception handling | ✅ Working | Exception messages preserved in PtcPythonError |
| Division by zero | ✅ Working | Standard Python exceptions surface |
| Output truncation | ⚠️ Partial | Works but adds ~50-60 chars overhead above stated limit |
| asyncio.run() rejection | ✅ Working | Pre-execution fast-path check |

### Composition Workflows (7)
| Capability | Status | Notes |
|-----------|--------|-------|
| search → inspect → summarize | ✅ Working | grep → read_many → fit_output chain |
| batch read → reduce → fit | ✅ Working | batch_tool → line counting → fit_output |
| introspection-gated branching | ✅ Working | list_callable_tools → conditional tool call |
| first-success fallback → fit | ✅ Working | failing_tool → grep fallback → fit_output |
| handle extraction workflow | ✅ Working | search_tool → extract_handles → first_handle |
| error-resilient pipeline | ✅ Working | batch_tool + try/except → fit_output |
| full pipeline (batch → gather → fit) | ✅ Working | batch_tool → gather_limit → fit_output |

## Bugs and Issues Found

### P0 — Critical
| Bug | Affected | Root Cause | Impact |
|-----|----------|-----------|--------|
| `glob()` missing `limit` kwarg | `ptc.find_files()`, `ptc.find_files_abs()`, `ptc.read_tree()` | `find_files()` calls `glob(limit=max_files)` but the Python glob wrapper doesn't accept `limit` | 3 helpers completely broken — core file-discovery surface unusable |

### P1 — Moderate
| Issue | Category | Impact |
|-------|----------|--------|
| Syntax errors surface as "RPC stdout closed" | Error reporting | Functional but unhelpful for model debugging |
| `batch_tool` fails fast — no partial results | Design choice | Models can't recover partial batch results on mixed success/failure |

### P2 — Low
| Issue | Category | Impact |
|-------|----------|--------|
| Output truncation adds ~50-60 char overhead | Output budget | Effective limit is slightly above stated maxOutputChars |
| `batch_tool([])` raises but `read_many([])` returns [] | Consistency | Inconsistent empty-input handling across helpers |

### Observations (non-bugs)
- All core wrappers require `await` — forgetting gives confusing "coroutine has no len()" error
- `grep()` takes keyword-only args — positional `grep("pattern")` fails
- `ptc.expect_kind()` requires a dict with `kind` field — raw strings fail with clear error

## Remediation Priority List

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| **P0** | Fix glob() to accept `limit` kwarg (or have find_files slice results) | Small — single function signature change | Unblocks 3 helpers (find_files, find_files_abs, read_tree) |
| **P1** | Catch syntax errors before subprocess crash | Medium — intercept Python compile step | Better error messages for model debugging |
| **P1** | Consider batch_tool partial-result mode | Medium — new error handling strategy | Enables resilient batch workflows |
| **P2** | Account for framing overhead in output truncation | Small — adjust maxOutputChars calculation | More predictable output budget |
| **P2** | Align empty-input handling (batch_tool vs read_many) | Small — choose one behavior | Consistency |

## Recommended Next Milestone Scope

**Milestone 15 — Bug Fixes and Helper Hardening**
1. Fix the glob/limit bug (P0) — immediate, small
2. Improve syntax error reporting (P1)
3. Add batch_tool partial-result option (P1)
4. Align empty-input behavior (P2)
5. Re-run the 3 broken audit tests to confirm fixes

## Test Coverage Summary

| Phase | Tests Added | Passing | Category |
|-------|------------|---------|----------|
| 36 | 21 | 21 | Individual helper functionality |
| 36 | 8 | 8 | Pipeline mechanics |
| 37 | 15 | 15 | Stress and edge cases |
| 38 | 7 | 7 | Composition workflows |
| **Total M14** | **51** | **51** | — |
| **Full suite** | **204** | **203** | 1 pre-existing failure (hashline-real-interop.mjs) |

**Quality trend:** 152 → 203 passing across Milestone 14 (+51 tests, +34%)

---

*Final audit report generated 2026-03-26. This is the primary deliverable of Milestone 14.*
