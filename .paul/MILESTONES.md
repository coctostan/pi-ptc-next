# Milestones

Completed milestone log for this project.

| Milestone | Completed | Duration | Stats |
|-----------|-----------|----------|-------|
| Milestone 1 — Active Tool Runtime Seam | 2026-03-16 | ~18 minutes | 1 phase, 1 plan |
| Milestone 2 — Structured Results Contract | 2026-03-17 | ~6 hours | 3 phases, 3 plans |
| Milestone 3 — Python Ergonomics and Metadata | 2026-03-17 | ~1.5 hours | 3 phases, 3 plans |
| Milestone 4 — Cross-Extension Tool Execution Bridge | 2026-03-18 | ~1 hour | 3 phases, 3 plans |
| Milestone 5 — Python Helper Normalization | 2026-03-18 | ~15 minutes | 2 phases, 2 plans |
| Milestone 6 — Review Findings Remediation | 2026-03-19 | ~20 minutes | 2 phases, 2 plans |

---

## ✅ Milestone 1 — Active Tool Runtime Seam

**Completed:** 2026-03-16
**Duration:** approximately 18 minutes

### Stats

| Metric | Value |
|--------|-------|
| Phases | 1 |
| Plans | 1 |
| Files changed | 4 |

### Key Accomplishments
- `code_execution` now prefers the active Pi executor for same-name overridden builtins when that override is active.
- Builtin fallback behavior remains intact when no active override is present.
- Focused regression tests now cover active override execution for `read`, `grep`, and `edit`.
- Nested callable tool resolution still excludes `code_execution` and preserves current policy behavior.
- Milestone documentation now captures the runtime seam explicitly.

### Key Decisions
- Keep the runtime seam in the registry/tool-resolution layer instead of broadening changes into Python runtime files.
- Prefer active Pi executors only when the same-name override is actually active.
- Preserve builtin fallback behavior and current allow/block policy handling.
- Reuse existing `test/code-executor.test.ts` execution-path coverage instead of expanding end-to-end tests unnecessarily.

---

## ✅ Milestone 2 — Structured Results Contract

**Completed:** 2026-03-17
**Duration:** approximately 6 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 8 |

### Key Accomplishments
- `normalizeToolResult()` now explicitly prefers `details.ptcValue` as the first-class machine-native result when present.
- Mocked hashline-style structured payload tests cover `read`, `grep`, and `edit` with fallback behavior preserved.
- Nested RPC handling preserves structured `details.ptcValue` results unchanged across the tool boundary.
- Model-facing `code_execution` guidance documents `ptcValue` passthrough and richer active override payloads.
- Lightweight combined interop smoke proof (`test/hashline-interop-smoke.test.ts`) exercises active override execution + structured value flow in one RPC path.
- Final interop docs closure in `README.md`, `docs/hashline-integration/START-HERE.md`, and `docs/hashline-integration/ROADMAP.md`.

### Key Decisions
- Make `ptcValue` preference explicit in the normalization layer before broader interop work.
- Prefer mocked hashline-style payload tests before a real two-extension smoke harness.
- Keep Phase 4 closure lightweight: prove active override + `ptcValue` flow with focused smoke coverage.
- Git commit/branch automation remains user-directed due to remote ownership constraints.

---

## ✅ Milestone 3 — Python Ergonomics and Metadata (0.2.0)

**Completed:** 2026-03-17
**Duration:** approximately 1.5 hours

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 15 |

### Key Accomplishments
- Python helper contracts now expose structured anchored result models (`ReadResult`, `GrepResult`, `AnchoredEditResult`, `SgResult`) for builtin `read` / `grep` / `edit` / `sg` with fallback-safe unions preserved.
- Generated tool wrappers emit richer TypedDict types so Python code can naturally consume hashline-native structured data.
- Extension tools now support explicit `ptc.callable` / `ptc.policy` metadata with full backward compatibility for legacy `ptc.enabled` / `ptc.readOnly`.
- Operator-level policy filters (`PTC_CALLABLE_TOOLS`, `PTC_BLOCKED_TOOLS`, `PTC_TRUSTED_READ_ONLY_TOOLS`) layer on top of metadata cleanly.
- Canonical combined-stack demo (`docs/hashline-integration/DEMO.md`) provides the authoritative search → inspect → edit walkthrough.
- Harness evaluation documented: lightweight smoke proof remains the recommended verification artifact pending packaging-level evidence for heavier infra.
- All 58 tests passing across the full suite.

### Key Decisions
- Prefer explicit `ptc.callable` / `ptc.policy` in docs and new tools while normalizing legacy metadata for backward compatibility.
- Keep the canonical demo separate from README to avoid duplication.
- Treat the lightweight smoke proof as the default verification artifact unless packaging-level problems surface.
- Close Milestone 3 with documentation-only final phase (no runtime changes needed).

---

## ✅ Milestone 4 — Cross-Extension Tool Execution Bridge (0.3.0)

**Completed:** 2026-03-18
**Duration:** approximately 1 hour

### Stats

| Metric | Value |
|--------|-------|
| Phases | 3 |
| Plans | 3 |
| Files changed | 5 (1 source + 4 test stubs) |
| Lines added | ~35 source + ~80 test |

### Key Accomplishments
- Implemented EventBus bridge: hashline emits tool executors on `"hashline:tool-executors"` channel, PTC subscribes and overlays them onto builtins in `buildToolMap()`.
- `globalThis.__hashlineToolExecutors` dual-path handles load-order (hashline fires before PTC subscribes).
- `read()` inside `code_execution` now returns structured `ReadResult` dicts with `line`, `hash`, `anchor`, `raw`, `display` fields.
- `grep()` inside `code_execution` now returns structured `GrepResult` dicts with `totalMatches`, `records` containing anchor fields.
- Split-brain tool behavior eliminated: nested PTC tool calls use the same hashline implementations the agent uses directly.
- Bridge is explicitly temporary with grep-able teardown markers (`"hashline:tool-executors"`) in both repos.
- 73/73 tests passing across the full suite.

### Key Decisions
- Overlay preserves original `source` field so builtins stay "builtin" for policy compliance in `getCallableTools()`.
- `globalThis` is the primary discovery path; EventBus `on()` is insurance for late/dynamic re-registration.
- Bridge teardown condition: remove when pi adds `getToolExecutor()` to the ExtensionAPI.
- Phase 8 emitter was already implemented in hashline repo — verification-only APPLY.

---

## ✅ Milestone 5 — Python Helper Normalization (0.4.0)

**Completed:** 2026-03-18
**Duration:** approximately 15 minutes

### Stats

| Metric | Value |
|--------|-------|
| Phases | 2 |
| Plans | 2 |
| Files changed | 3 (runtime.py, index.ts, index.test.ts) |

### Key Accomplishments
- Added `_extract_text()` helper in `runtime.py` that normalizes `ReadResult` dicts back to raw text strings.
- `ptc.read_text()` now always returns `str` as documented.
- `ptc.read_many()` now always returns `list[str]` — common patterns like `content.split("\n")` work again.
- `ptc.read_tree()` returns `list[dict]` with `content` as `str` — `len(entry["content"])` works.
- `read()` itself unchanged — still `Union[str, ReadResult]` for models that want structured anchored data.
- Model-facing `code_execution` guidance updated with accurate signatures and clear `read()` vs `ptc.read_text()` distinction.
- 73/73 tests green, all helpers verified live in-session.

### Key Decisions
- Normalize in the helper layer, not in `read()` itself. Models that want structured data call `read()` directly.
- `_extract_text()` joins `lines[].raw` with newlines — faithful to the original file content.

---

## ✅ Milestone 6 — Review Findings Remediation (0.5.0)

**Completed:** 2026-03-19
**Duration:** approximately 20 minutes

### Stats

| Metric | Value |
|--------|-------|
| Phases | 2 |
| Plans | 2 |
| Files changed | 4 (rpc.py, runtime.py, index.ts, index.test.ts) |
| Findings resolved | 6 of 6 (0 deferred) |

### Key Accomplishments
- **E9 (HIGH):** Increased Python RPC `asyncio.StreamReader` limit from 64KB to 4MB. Files >250 lines no longer hang for 270s. README.md (530 lines) now reads in 7ms.
- **E8 (MEDIUM):** Added `_relativize_path()` + `_normalize_grep_result()` + grep wrapper in `runtime.py`. Grep record paths are now always workspace-relative regardless of bridge state. Grep → read pipelines work end-to-end.
- **D1+D4 (MEDIUM):** Removed 4 operator-facing rules (~400 chars) from the model-facing `code_execution` description. ptcValue, ptc.callable, PTC_CALLABLE_TOOLS, PTC_BLOCKED_TOOLS no longer in model prompt.
- **D2 (MEDIUM):** "Prefer these for string content" block and "Use read(path) directly for structured anchored data" guidance added.
- **D3 (LOW):** String content helpers documented inline alongside the existing bulk example.
- All findings verified live in-session. 73/73 tests green.

### Key Decisions
- 4MB StreamReader limit provides ~50x headroom over the old 64KB default.
- Grep path normalization happens in a runtime.py wrapper that captures the generated `grep()` at module load time.
- Python runtime loads from disk on every `code_execution` call — no session restart needed for Python-side fixes.
- `doesNotMatch` test assertions guard against accidental re-addition of operator rules.

---