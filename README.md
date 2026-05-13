# pi-ptc-advanced
`pi-ptc-advanced` is a public Programmatic Tool Calling extension for pi-coding-agent. It adds a provider-agnostic `code_execution` tool: the model writes Python code, Python calls local pi tools through an internal RPC bridge, and only the final Python output is returned to the model context.

This is **not** Anthropic's provider-native PTC wire protocol. Instead, it implements the same core local behavior in a way that can work across multiple labs and models such as GPT-5.4, GLM-5, and Claude-class models.

The current release baseline is **`pi-ptc-advanced@1.0.0`**. The GitHub repository is intended to be renamed to `coctostan/pi-ptc-advanced`; until that repository rename is performed, historical links may still appear in credits and older release material.

## Installation

Install the public package identity:

```bash
pi install pi-ptc-advanced
```

For GitHub-based installs after the repository rename, use:

```bash
pi install git:github.com/coctostan/pi-ptc-advanced
```

The repo-local release verification path validates the package metadata, tarball contents, and clean install proof for **`pi-ptc-advanced@1.0.0`**. Actual `npm publish`, git tags, GitHub releases, and the GitHub repository rename remain manual/user-owned operations.

## Personal fork maintenance

Use the repo-local maintenance workflow for routine verification and release-surface checks:
```bash
./scripts/start-pi-ptc-full-tools.sh
npm run verify:personal
npm run verify:personal:full
npm run verify:ci
npm run verify:release-package
```
- `./scripts/start-pi-ptc-full-tools.sh` starts Pi with the preferred analysis-oriented personal profile
- `npm run verify:personal` runs the focused maintenance verification bundle
- `npm run verify:personal:full` runs the higher-confidence full verification path
- `npm run verify:ci` runs the repo-owned CI parity bundle used by `.github/workflows/ci.yml`
- `npm run verify:release-package` validates the package metadata and `npm pack --dry-run` tarball surface for the `pi-ptc-advanced@1.0.0` baseline
For the full maintainer runbook, including the explicit manual git sync/upgrade boundary and how the verification-only workflow at [`.github/workflows/ci.yml`](.github/workflows/ci.yml) fits beside still-manual release/publish concerns, see [`docs/personal-fork-maintenance.md`](docs/personal-fork-maintenance.md).
Release docs for the active baseline:
- [`CHANGELOG.md`](CHANGELOG.md)
- [`docs/releases/1.0.0.md`](docs/releases/1.0.0.md)
- Previous baseline: [`docs/releases/0.18.0.md`](docs/releases/0.18.0.md)
- Historical baseline: [`docs/releases/0.16.0.md`](docs/releases/0.16.0.md)
- Historical baseline: [`docs/releases/0.15.0.md`](docs/releases/0.15.0.md)
- Historical baseline: [`docs/releases/0.8.0.md`](docs/releases/0.8.0.md)

## Credits and lineage

This codebase started from the original [`cegersdoerfer/pi-ptc`](https://github.com/cegersdoerfer/pi-ptc) by [@cegersdoerfer](https://github.com/cegersdoerfer) (Chris Egersdoerfer).

It later continued through the `coctostan/pi-ptc-next` fork/repo lineage before the package and release surface moved to **`pi-ptc-advanced`** for the public 1.0 baseline. Credit and history remain part of the project:

- upstream origin: `cegersdoerfer/pi-ptc`
- prior fork/repo lineage: `coctostan/pi-ptc-next`
- current public package identity: `pi-ptc-advanced`

The main work done here includes:
- refactoring the codebase into clearer execution, contract, and tool submodules
- replacing the split loader/watcher flow with an authoritative custom tool manager
- tightening the runtime protocol and execution error boundaries
- making subprocess execution explicit opt-in and improving Docker behavior
- adding direct behavioral tests for the core execution/runtime/tooling paths
- improving package loading, vendoring local reference material for PTC/advanced tool use, and benchmarking real pi usage
## Combined stack notes

If you pair this extension with `pi-hashline-readmap`, the first-pass maintainer story is:

- active overridden `read` / `grep` / `edit` executors should be the same implementations users see in chat
- structured `details.ptcValue` payloads should cross the RPC boundary unchanged when active tools provide them
- explicit `ptc.callable` / `ptc.policy` metadata should describe extension-tool exposure and safety traits
- the focused verification point is `npm run build && node --test test/hashline-interop-smoke.test.ts`

Today that interop path is intentionally narrow: `src/tool-registry.ts` overlays active hashline executors through a `globalThis` fallback plus the EventBus channel `hashline:tool-executors`. This is a temporary bridge so `code_execution` can use the same active tool implementations users see in chat, and it should be removed once Pi exposes `getToolExecutor()` on `ExtensionAPI`.

## What using it feels like now

Use it normally.

For simple requests, the agent should still use direct tools like `read`, `grep`, and `find`.
For strong PTC-shaped requests, the extension now biases the agent toward `code_execution` proactively.

Common auto-routing signals:

- repo-wide or multi-file analysis
- repeated lookups across many inputs
- counting, grouping, ranking, filtering, or aggregation
- prompts like "compact JSON only" or "keep intermediate results out of chat"

This behavior is enabled by default with `PTC_AUTO_ROUTE=true`.
The `code_execution` tool is also surfaced through Pi prompt metadata: a one-line `promptSnippet` appears in the default `Available tools` section, and active-only `promptGuidelines` summarize when to prefer Python-backed batching versus direct tools. Auto-routing remains a conservative fallback for strong PTC-shaped prompts.
Completed `code_execution` results keep the default tool row compact while preserving executed Python source in expanded details; recognized `ptc.report(...)` returns also get compact structured report rendering plus `details.report` for tests and evals.

Use `nu` instead of `code_execution` for pipeline-style structured-data or filesystem-metadata analysis (`where`, `sort-by`, `group-by`, `first`, `histogram`). Use `code_execution` when the task needs custom per-item Python logic, stateful aggregation, complex output shapes, or multiple callable-tool calls orchestrated inside one local run.

## Why this exists

Without PTC, multi-step tool use usually looks like this:

1. Model calls a tool
2. Tool result comes back into the conversation
3. Model reasons over that result in-context
4. Repeat for every additional tool call

That is expensive for large intermediate results.

With `code_execution`, the model can do this instead:

1. Write Python once
2. Call tools from Python as async functions
3. Filter/aggregate/loop locally
4. Return only the compact final answer

## What changed in this version

This implementation now focuses on provider-agnostic reliability:

- Added a real hard execution timeout for the whole Python run
- Added a `glob()` alias over pi's `find()` behavior for model ergonomics
- Normalized common built-in tool results into Python-friendly values
- Excluded `code_execution` from calling itself recursively
- Added local tool opt-in metadata for custom/extension tools
- Added nested execution metrics such as nested tool count and estimated avoided tokens
- Added bounded concurrency helper utilities in Python
- Added `ptc.read_tree(...)` for deterministic find+read workflows
- Added bounded async-only auto-recovery for common first-attempt async wrapper mistakes
- Added ephemeral request telemetry for routing, first-path, recovery count, and terminal state in successful `code_execution` details
- Added deterministic JSON eval cases and a local benchmark runner for routing/recovery checks
- Added regression coverage for mutation-prompt exclusion, one-shot recovery limits, and per-request state reset
- Added `ptc.report(...)` for structured summaries with richer completed-result rendering and preserved `details.report` metadata

## Available Python functions

By default, Python code inside `code_execution` can call a safe built-in subset. Direct callable Pi tool wrappers are async: use `await read(...)`, `await grep(...)`, and so on. The separate `ptc.*` helpers follow their listed sync/async signatures.

- `await read(path, *, offset=None, limit=None, symbol=None, map=None) -> Union[str, ReadResult]`
- `await glob(pattern, path='.', limit=1000) -> list[str]`
- `await find(pattern, path='.', limit=1000) -> list[str]`
- `await grep(...) -> Union[List[GrepMatch], GrepResult]`; use `await grep(pattern="pattern", path='...')` or positional shorthand `await grep("pattern", path='...')`
- `await ls(path='.', limit=500) -> list[str]`

Optional tools can be enabled via environment/config policy:

- `await sg(pattern, *, lang=None, path=None) -> SgResult` (requires explicit opt-in via `PTC_CALLABLE_TOOLS=...,sg` and Pi still has to expose it to PTC with callable runtime + metadata)
- `bash(...) -> dict`
- `edit(...) -> AnchoredEditResult`
- `write(...) -> dict`

Custom and extension tools are **not callable from Python by default**. They must opt in with `ptc.callable: true`, and `ptc.policy: "read-only" | "mutating"` declares the safety class the registry enforces. That keeps the default surface conservative, leaves mutating tools unavailable unless both metadata and runtime policy allow them, and preserves legacy compatibility with `ptc.enabled` / `ptc.readOnly`.
For personal use, this repo now also carries `scripts/start-pi-ptc-full-tools.sh`, an analysis-oriented launcher profile that keeps the surface read-only while requesting `sg` plus selected graph tools.

If you opt into that profile, note the important limitation: `PTC_CALLABLE_TOOLS` is a filter, not a loader. It can only expose tools that Pi already makes visible to PTC in the current session. If a requested tool is missing from the active Pi tool set or lacks the expected `ptc.callable` metadata, PTC will warn and keep it out of `code_execution` rather than silently pretending the allowlist succeeded.
If Python needs to branch on optional tools, inspect `ptc.list_callable_tools()` first. The live session surface is authoritative; config and allowlists do not guarantee that a helper is callable in the current run.

`ptc.list_callable_tools()` lists **callable Pi tools** that cross the RPC boundary (e.g. `read`, `grep`, `edit`). It does NOT list `ptc.*` helpers, which live in this runtime. Use `ptc.list_helpers()` for the curated `ptc.*` helper inventory (each entry has `name`, `signature`, and a one-line `summary`).

## Structured override payloads (`details.ptcValue`)

The helper signatures above are the **fallback normalization defaults**.
If a callable tool returns `details.ptcValue`, that JSON-compatible value is returned to Python unchanged.

This is especially important for active hashline-native overrides of `read`, `grep`, and `edit`, which can expose richer anchored payloads than the fallback signatures imply.

Representative structured payloads:

```json
{
  "tool": "read",
  "path": "tests/fixtures/small.ts",
  "range": {
    "startLine": 45,
    "endLine": 49,
    "totalLines": 49
  },
  "warnings": [],
  "truncation": null,
  "symbol": {
    "query": "createDemoDirectory",
    "name": "createDemoDirectory",
    "kind": "function",
    "startLine": 45,
    "endLine": 49
  },
  "map": {
    "requested": false,
    "appended": false
  },
  "lines": [
    {
      "line": 45,
      "hash": "4bf",
      "anchor": "45:4bf",
      "raw": "export function createDemoDirectory(): UserDirectory {",
      "display": "export function createDemoDirectory(): UserDirectory {"
    },
    {
      "line": 46,
      "hash": "59a",
      "anchor": "46:59a",
      "raw": "  const directory = new UserDirectory(500);",
      "display": "  const directory = new UserDirectory(500);"
    },
    {
      "line": 47,
      "hash": "9c3",
      "anchor": "47:9c3",
      "raw": "  directory.addUser(\"Ada Lovelace\", \"ada@example.com\");",
      "display": "  directory.addUser(\"Ada Lovelace\", \"ada@example.com\");"
    },
    {
      "line": 48,
      "hash": "6e1",
      "anchor": "48:6e1",
      "raw": "  return directory;",
      "display": "  return directory;"
    },
    {
      "line": 49,
      "hash": "b18",
      "anchor": "49:b18",
      "raw": "}",
      "display": "}"
    }
  ]
}
```

```json
{
  "tool": "grep",
  "summary": false,
  "totalMatches": 1,
  "records": [
    {
      "path": "tests/fixtures/small.ts",
      "line": 44,
      "anchor": "44:97e",
      "kind": "context"
    },
    {
      "path": "tests/fixtures/small.ts",
      "line": 45,
      "anchor": "45:4bf",
      "kind": "match"
    },
    {
      "path": "tests/fixtures/small.ts",
      "line": 46,
      "anchor": "46:59a",
      "kind": "context"
    }
  ]
}
```

```json
{
  "tool": "ast_search",
  "files": [
    {
      "path": "demo.ts",
      "ranges": [
        {
          "startLine": 2,
          "endLine": 2
        }
      ],
      "lines": [
        {
          "line": 2,
          "hash": "310",
          "anchor": "2:310",
          "raw": "  const value = \"before\";",
          "display": "  const value = \"before\";"
        }
      ]
    }
  ]
}
```

```json
{
  "tool": "edit",
  "ok": true,
  "path": "sample.ts",
  "summary": "Updated sample.ts",
  "diff": "2:5bd|const two = 2; → 2:086|const two = 22;",
  "diffData": {
    "version": 1,
    "entries": [
      {
        "kind": "remove",
        "oldLine": 2,
        "text": "const two = 2;"
      },
      {
        "kind": "add",
        "newLine": 2,
        "text": "const two = 22;"
      }
    ],
    "stats": {
      "added": 1,
      "removed": 1,
      "context": 0
    },
    "language": "typescript",
    "inlineDiffs": [
      {
        "removeLineIndex": 0,
        "addLineIndex": 1,
        "removeSpans": [
          {
            "kind": "equal",
            "text": "const two = "
          },
          {
            "kind": "remove",
            "text": "2"
          },
          {
            "kind": "equal",
            "text": ";"
          }
        ],
        "addSpans": [
          {
            "kind": "equal",
            "text": "const two = "
          },
          {
            "kind": "add",
            "text": "22"
          },
          {
            "kind": "equal",
            "text": ";"
          }
        ]
      }
    ]
  },
  "firstChangedLine": 2,
  "warnings": [],
  "noopEdits": [],
  "semanticSummary": {
    "classification": "semantic",
    "difftasticAvailable": true
  }
}
```

If `details.ptcValue` is absent, fallback normalization still applies (`read -> str`, `grep -> list[dict]`, `edit -> dict`).

## Real compatibility harness

A package-real combined proof now lives at `test/hashline-real-interop.test.ts`.

Run it directly:
```bash
npm run build
node --test test/hashline-real-interop.test.ts
```
What it validates:
- the actual `pi-hashline-readmap` package is loaded into the runtime
- `sg` is exposed only through the inline opt-in PTC metadata path
- nested `code_execution` uses real `read`, `grep`, `sg`, and `edit` implementations
- Python receives structured `details.ptcValue` payloads at each step without mocked historical shapes
- the file really changes on disk after the `edit` step
- `grep` confirms the mutation by matching the new content

This fork also supports caller routing metadata via `ptc.callers`:

- `callers: ["direct"]` — direct-only tool
- `callers: ["code_execution"]` — Python-only tool
- `callers: ["direct", "code_execution"]` — both

## Model-facing usage rules

The `code_execution` tool is best for:

- 3+ dependent tool calls
- loops, filtering, aggregation, and batching
- large intermediate results that should stay out of chat history
- inspecting many files and returning a compact summary

Avoid it for:

- one simple tool call
- workflows where the user explicitly needs every raw intermediate result in the chat transcript

Important runtime rules:

- Top-level `await` is already available
- Do **not** call `asyncio.run(...)`
- Do **not** call `_rpc_call(...)` directly; use the generated wrappers and `ptc.*` helpers
- Prefer returning compact JSON or summaries
- Intermediate tool results stay local unless you explicitly print or return them
- Use the callable tool list in the `code_execution` description before adding extra introspection calls; call `ptc.list_callable_tools()` only when branching on optional tools or when a needed tool may be unavailable

## Python helpers

The runtime also exposes a `ptc` helper object:

- `await ptc.gather_limit(coros, limit=8)`
- `await ptc.read_many(paths, max_concurrency=None, offset=None, line_limit=None, on_error=None) -> list[str] | dict[str, Any]`
  - Default returns `list[str]`; missing/unreadable entries become a bounded `"[read_many error] ..."` marker instead of leaking a traceback.
  - Pass `on_error='collect'` for a typed envelope: `kind="read_many_partial"` with per-entry `{index, path, ok, value | error}` and `stats {total, succeeded, failed}`.
- `await ptc.read_tree(pattern, path='.', max_files=1000, concurrency=None, offset=None, line_limit=None, relative=False, relative_to=None)`
- `await ptc.find_files(pattern, path='.', max_files=1000, relative=True, relative_to=None)`
- `await ptc.find_files_abs(pattern, path='.', max_files=1000, relative=False, relative_to=None)`
- `await ptc.read_text(path, offset=None, limit=None)`
- `await ptc.batch_tool(calls, max_concurrency=None, on_error=None) -> list[Any] | dict[str, Any]`
  - Use `on_error='collect'` for bounded partial mode (`kind="batch_partial"`) with per-call success/error entries instead of raising on first failure
  - In `on_error='collect'`, tool-level normalized error payloads (`{ok: false, error: ...}` or `kind: "execution_error"`) are classified as failed entries (`ok: false`, `error` summary) while the raw payload is preserved under `value`. Default `on_error='raise'` is unchanged.
  - Path-normalization invariant: direct `read()`/`grep()` wrappers, `ptc.read_*` helpers, and `ptc.batch_tool` `read`/`grep` payloads all return workspace-relative `path` fields when the target is under the host workspace root (out-of-workspace absolute paths are preserved as-is).
- `await ptc.first_success(calls, max_concurrency=None) -> Any`
- `await ptc.reduce_tool(calls, reducer, initial, max_concurrency=None) -> Any`
- `ptc.fit_output(value, max_chars=None, max_items=None, max_depth=None) -> dict[str, Any]`
- `ptc.report(title, metrics=None, tables=None, samples=None, warnings=None) -> dict[str, Any]`
- `ptc.tabulate(rows, headers=None, title=None) -> dict[str, Any]`
- `ptc.diff(before, after) -> dict[str, Any]`
- `ptc.expect_kind(value, kind) -> Any`
- `ptc.list_callable_tools() -> list[dict[str, Any]]`
- `ptc.list_helpers() -> list[dict[str, Any]]`
  - Curated `ptc.*` helper inventory; each entry has `name`, `signature`, and a one-line `summary`. Counterpart to `ptc.list_callable_tools()`, which lists callable Pi tools (not helpers).
- `ptc.get_tool_schema(name) -> dict[str, Any]`
- `ptc.help(tool_name) -> dict[str, Any]`
- `ptc.run_tests(pattern) -> dict[str, Any]`
  - Runs Node's built-in `node --test <pattern>` from inside `code_execution` and returns a `ptc_report` with pass/fail/duration metrics, quoted command metadata, scalar `runner_path`/`runner_resolution` fields, a bounded failures table, and a `runner_available` flag. Requires Node in the active runtime; Python-only or Docker runtimes may report `runner_available: false` as structured data rather than raising. Node-only for this phase: no vitest/jest/pytest, no package-script dispatch, no Docker image changes. Use it for focused test reporting, not as a replacement for normal repo verification commands like `npm test`, `npm run build`, or PALS verification gates.
- `ptc.extract_handles(value, kind=None) -> list[SupportedHandle]`
- `ptc.first_handle(value, kind=None) -> Optional[SupportedHandle]`
- `ptc.json_dump(value)`
`SupportedHandle = Union[ResponseHandle, FileHandle]`
`kind` is bounded to `"response"` or `"file"`.
`ptc.expect_kind(...)` is a bounded top-level kind assertion for structured payloads that already expose `kind`.
Use orchestration helpers when you have repeated multi-tool calls, ordered fallback logic, or large intermediate results that should stay local to Python.
For one simple tool call, call the tool directly.
Optional tools should be detected from `ptc.list_callable_tools()`, not assumed from env/config alone.
Use `ptc.help(tool_name)` when optional-tool prompt metadata would help choose or parameterize a tool. Do not run introspection as a routine prelude; use the callable tool list in the generated description when it is already sufficient.
Use these helpers for structured tool results that already carry `responseId` and/or `filePath`; they avoid custom recursive JSON walking while keeping the contract intentionally narrow.
Response/file handles are supported now; graph handles are still out of scope.
Report returns are a soft contract: recognized reports get richer completed tool-result rendering and `details.report`, while free-form strings/dicts/lists and `ptc.fit_output(...)` continue to work normally.
Path helpers default to their historical shape (`find_files` relative, `find_files_abs` absolute, `read_tree` absolute entry paths) and accept `relative` / `relative_to` when callers need root-aware formatting.
Bridge helpers are intentionally slim: `ptc.tabulate(...)` prepares report table payloads, and shallow `ptc.diff(...)` compares explicit before/after values. Prefer `nu` for grouping, histograms, ranking, and pipeline-style data analysis.
Report helper example:

```python
return ptc.report(
    title="Repo summary",
    metrics={"files": 42, "tests_green": True},
    tables=[{
        "title": "Largest files",
        "columns": ["path", "lines"],
        "rows": [{"path": "src/index.ts", "lines": 523}],
    }],
    samples=[{"label": "entry point", "value": {"path": "src/index.ts"}}],
    warnings=["README is size-sensitive"],
)
```

Bridge helper example:

```python
rows = [{"path": "src/index.ts", "lines": 523}]
return ptc.report(
    title="Bridge helper summary",
    tables=[ptc.tabulate(rows, title="Largest files")],
    samples=[{"label": "delta", "value": ptc.diff({"files": 41}, {"files": 42})}],
)
```
Handle workflow example:

```python
result = await fetch_content(url="https://example.com/page")
response_handle = ptc.first_handle(result, kind="response")
file_handle = ptc.first_handle(result, kind="file")
return {
    "all_handles": ptc.extract_handles(result),
    "response_preview": await get_search_content(responseId=response_handle["responseId"], urlIndex=0)
    if response_handle
    else None,
    "file_preview": await ptc.read_text(file_handle["filePath"], limit=20)
    if file_handle
    else None,
}
```

General helper example:

```python
entries = await ptc.read_tree(pattern="**/*.ts", path="src", concurrency=6)
return {
    "files": len(entries),
    "sample_lengths": [len(entry["content"]) for entry in entries[:3]],
}
```

Hashline-style reduction example:

```python
search_calls = [
    {"tool": "grep", "params": {"pattern": "TODO", "path": "src", "glob": "**/*.ts"}},
    {"tool": "grep", "params": {"pattern": "FIXME", "path": "src", "glob": "**/*.ts"}},
]
searches = await ptc.batch_tool(search_calls, max_concurrency=2)
summary = await ptc.reduce_tool(
    search_calls,
    lambda acc, entry: acc
    + [{
        "matches": len(entry),
        "sample": entry[0]["line"] if entry else None,
    }],
    initial=[],
    max_concurrency=2,
)
return ptc.fit_output({"searches": searches, "summary": summary}, max_chars=1500, max_items=3, max_depth=3)
```

Codegraph-style ordered fallback example:

```python
tools_by_name = {tool["name"]: tool for tool in ptc.list_callable_tools()}

if "symbol_card" in tools_by_name and "symbol_search" in tools_by_name:
    graph_result = await ptc.first_success([
        {"tool": "symbol_card", "params": {"name": "CodeExecutor"}},
        {"tool": "symbol_search", "params": {"query": "CodeExecutor", "limit": 1}},
    ])
    return ptc.fit_output(graph_result, max_chars=1500, max_items=3, max_depth=3)

return {"used_tool": None, "available_tools": sorted(tools_by_name)}
```

Callable-tool help example:

```python
tools = {tool["name"]: tool for tool in ptc.list_callable_tools()}
if "sg" in tools:
    sg_help = ptc.help("sg")
    sg_schema = ptc.get_tool_schema("sg")
    return {"description": sg_help["description"], "guidelines": sg_help.get("promptGuidelines", []), "schema": sg_schema}
```

Web-handle follow-up with bounded output example:

```python
result = await fetch_content(url="https://example.com/page")
response_handle = ptc.first_handle(result, kind="response")
file_handle = ptc.first_handle(result, kind="file")
payload = {
    "all_handles": ptc.extract_handles(result),
    "response_preview": await get_search_content(responseId=response_handle["responseId"], urlIndex=0)
    if response_handle
    else None,
    "file_preview": await ptc.read_text(file_handle["filePath"], limit=20)
    if file_handle
    else None,
}
return ptc.fit_output(payload, max_chars=1500, max_items=3, max_depth=3)
```

Safe branching/introspection example:

```python
tools_by_name = {tool["name"]: tool for tool in ptc.list_callable_tools()}

if "sg" in tools_by_name:
    sg_schema = ptc.get_tool_schema("sg")
    matches = await sg(pattern="console.log($$$ARGS)", lang="typescript", path="src")
    return {
        "used_tool": tools_by_name["sg"]["pythonName"],
        "schema_type": sg_schema["type"],
        "files_with_matches": len(matches["files"]),
    }

return {
    "used_tool": None,
    "available_tools": sorted(tools_by_name),
}
```

## Result normalization

pi tools are normalized before being returned to Python using this precedence:

1. `details.ptcValue` (when present) is returned unchanged.
2. Otherwise, fallback normalization rules are applied.

Fallback defaults:
- `read` returns a string
- `find`, `glob`, and `ls` return `list[str]`
- `grep` returns `list[dict]`
- `bash`, `edit`, and `write` return dictionaries
- empty `find`/`ls`/`grep` results become empty lists rather than English sentinel strings
This keeps the runtime predictable for non-Anthropic models while allowing richer structured hashline payloads when active tools provide them.

## Local tool policy

This extension uses a local provider-agnostic equivalent of `allowed_callers`.

### Built-ins

Safe read-only built-ins are callable by default.

### Mutating tools

`bash`, `edit`, and `write` are blocked unless explicitly enabled.

### Custom and extension tools

These must opt in with explicit PTC metadata:

```js
ptc: {
  callable: true,
  policy: "read-only",
  callers: ["code_execution"], // optional: direct | code_execution | both
}
```

Legacy `ptc.enabled: true` / `ptc.readOnly: true` still work, but new docs and examples prefer `ptc.callable` / `ptc.policy`.
Custom tools may also declare Pi prompt metadata. PTC preserves `promptSnippet` and `promptGuidelines` when registering custom tools, so direct custom-tool registrations and PTC-managed custom tools expose the same prompt guidance fields.

Recommended routing patterns:
- `callers: ["direct"]` — user-facing tool that the model should call directly
- `callers: ["code_execution"]` — helper tool intended only for Python/PTC workflows
- `callers: ["direct", "code_execution"]` — shared tool usable from either path

## Environment variables

### Execution

- `PTC_USE_DOCKER=true` — run Python inside Docker instead of a local subprocess
- `PTC_ALLOW_UNSANDBOXED_SUBPROCESS=true` — explicitly opt into local subprocess mode when Docker is not used
- `PTC_EXECUTION_TIMEOUT_MS=270000` — hard timeout for the full Python execution
- `PTC_MAX_OUTPUT_CHARS=100000` — truncate final output after this many characters
- `PTC_MAX_PARALLEL_TOOL_CALLS=8` — default concurrency for `ptc.gather_limit()`

### Tool policy

- `PTC_ALLOW_MUTATIONS=true` — allow mutating tools from Python
- `PTC_ALLOW_BASH=true` — allow `bash` from Python
- `PTC_AUTO_ROUTE=true` — auto-route repo-wide analysis prompts toward `code_execution` (default: true)
- `PTC_AUTO_RECOVER=true` — enable one bounded async-only recovery hint after a qualifying first-attempt `code_execution` failure (default: false)
- `PTC_AUTO_RECOVER_MAX_ATTEMPTS=1` — bounded recovery cap; values above `1` are clamped back to `1`
- `PTC_TRUSTED_READ_ONLY_TOOLS=query_db,fetch_metadata` — allowlisted custom tools treated as read-only when mutations are disabled
- `PTC_CALLABLE_TOOLS=read,glob,find,grep,ls` — explicit allowlist override
- `PTC_BLOCKED_TOOLS=bash,write` — explicit denylist override
- `PTC_EVALS_PATH=.pi/evals/ptc` — override the JSON eval/benchmark root used by the benchmark runner

### Personal analysis profile
If this fork is primarily for your own workstation, you can launch Pi with the bundled analysis-oriented profile:

```bash
./scripts/start-pi-ptc-full-tools.sh
```

That profile keeps mutations and shell access disabled, requests `sg` plus selected graph tools, and leaves `edit`, `write`, `bash`, `resolve_edge`, and `delete_edge` out of the Python surface on purpose.

For the routine local maintenance flow, pair it with:
```bash
npm run verify:personal
npm run verify:personal:full
npm run verify:release-package
```

The package check validates the current **`pi-ptc-advanced@1.0.0`** release baseline without running publish automation.
The profile is still constrained by Pi runtime visibility: if Pi does not expose one of those requested tools to PTC with callable metadata in the current session, the tool will stay unavailable inside `code_execution` and PTC will emit a warning describing the gap.
See [`docs/personal-fork-maintenance.md`](docs/personal-fork-maintenance.md) for the full maintainer workflow and the explicit manual git sync/upgrade boundary.

## How it works

```text
User request
  ↓
Model calls code_execution
  ↓
pi-ptc builds Python wrappers for callable tools
  ↓
Python runtime executes user code
  ↓
Python calls tools over local JSON RPC
  ↓
Node executes real pi tools
  ↓
Results are normalized into Python-friendly values
  ↓
Python returns one compact final output
```

## Architecture

- `src/index.ts` — registers `code_execution` and model guidance
- `src/code-executor.ts` — execution orchestration and global timeout
- `src/tool-registry.ts` — tool discovery, policy, and caller metadata
- `src/tool-adapters.ts` — normalization of pi tool results
- `src/rpc-protocol.ts` — Node-side RPC bridge and nested metrics
- `src/python-runtime/runtime.py` — Python runtime and helpers
- `src/python-runtime/rpc.py` — Python-side RPC client
- `src/custom-tool-manager.ts` — authoritative custom tool loading, registration, and hot reload
- `src/execution/` — execution session, sandbox, runtime assets, and error boundaries
- `src/tools/` — Python helper contracts, wrapper generation, and tool policy integration

## Execution modes

### Subprocess mode

Explicit opt-in mode.

Enable with:

```bash
export PTC_ALLOW_UNSANDBOXED_SUBPROCESS=true
```

Behavior:

- runs `python3 -u -c ...` in the current working directory
- simplest setup
- suitable for trusted local use
- only enabled when Docker mode is disabled
- if neither `PTC_USE_DOCKER=true` nor `PTC_ALLOW_UNSANDBOXED_SUBPROCESS=true` is set, PTC refuses to execute Python

### Docker mode

Enable with:

```bash
export PTC_USE_DOCKER=true
```

Behavior:

- uses `python:3.12-slim`
- disables network access
- mounts the workspace read-only
- applies container memory/CPU limits
- reuses the container for multiple executions during the session

## Execution limits

- Hard timeout: `PTC_EXECUTION_TIMEOUT_MS` (default `270000` ms)
- Max final output: `PTC_MAX_OUTPUT_CHARS` (default `100000` chars)
- Per nested tool call timeout: 300 seconds in the Python RPC client
- Cancellation: abort signals are supported

## Custom tools

Drop `.js` files into `tools/`.

Example:

```js
export default {
  name: "query_db",
  description: "Run a read-only database query",
  parameters: {
    type: "object",
    properties: {
      sql: { type: "string" },
    },
    required: ["sql"],
  },
  ptc: {
    callable: true,
    policy: "read-only",
  },
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    return {
      content: [{ type: "text", text: "Query completed" }],
      details: {
        ptcValue: {
          rows: [],
          rowCount: 0,
        },
      },
    };
  },
};
```

If `details.ptcValue` is present, that JSON-compatible value is returned directly to Python.
Prefer `ptc.callable` / `ptc.policy` in new tools; `ptc.enabled` / `ptc.readOnly` remain supported for backward compatibility.

## Hot reload

Custom `.js` tools in `tools/` are watched and hot-reloaded while the session is running.

## Routing notes

This fork now implements a local/provider-agnostic equivalent of Anthropic's `allowed_callers` guidance.

Important practical points:

- `code_execution` is still just a tool choice from the model's perspective; nothing native in pi forces a model to use it.
- To improve reliability, the extension now adds three layers of steering:
  - a Pi `promptSnippet` that makes `code_execution` visible in the default `Available tools` section
  - active-only `promptGuidelines` for high-level routing rules
  - prompt-time auto-routing for requests that look like clear PTC fits
- Auto-routing is deliberately conservative, avoids prompts that look like editing or implementation tasks, and skips duplicate prompt text when Pi's `systemPromptOptions` already carry equivalent `code_execution` guidance.

### Bounded async-only recovery

Optional recovery is intentionally narrow.

- Enable it with `PTC_AUTO_RECOVER=true`.
- Recovery only applies to `code_execution` failures that clearly come from using async helpers like `read`, `glob`, `find`, `grep`, or `ls` without `await`.
- The extension appends one deterministic corrective hint on the next turn and allows at most one automatic recovery attempt per user request.
- Mutation prompts are ineligible, and the initial implementation does not broaden literal path semantics or auto-recover zero-match path cases.
- Recovery metadata is additive only: successful `code_execution` results include `details.telemetry` and `details.recovery`, but no persistent telemetry sink is written outside benchmark result files.

For the deeper technical explanation and research notes, see [`docs/PTC-RESEARCH.md`](docs/PTC-RESEARCH.md).

## Deterministic JSON evals and benchmarks

Seeded eval cases live under `.pi/evals/ptc/cases` and use stable JSON files:

```json
{
  "id": "recovery-missing-await",
  "prompt": "Use Python to read package.json and return compact JSON only.",
  "expected_first_path": "code_execution",
  "acceptance": {
    "type": "behavioral",
    "rules": [
      "observed_first_path=code_execution",
      "recovery_attempted=true",
      "failure_class=missing-await",
      "success=true"
    ]
  }
}
```

Current seeded buckets cover:

- positive repo-wide PTC routing
- negative direct single-file routing
- mutation-prompt negative controls
- async recovery cases for `missing-await` and `async-wrapper-iterated`

Build first, then run the benchmark CLI directly from `dist`:

```bash
npm run build
node dist/run-benchmarks.js \
  --provider local \
  --model seeded \
  --evals-path .pi/evals/ptc \
  --cases recovery-missing-await
```

Useful flags:

- `--results-path <file>` to write a specific JSON result file
- `--baseline <file>` to compare against a saved baseline without changing source planning docs
- `--timestamp <iso>` for deterministic output paths in CI or local comparisons

Each result record includes at least `case_id`, `observed_first_path`, `success`, `recovery_attempted`, `failure_class`, `total_tokens`, and `duration_ms`.

Successful `code_execution` runs also expose additive request metadata in tool result details:

```json
{
  "telemetry": {
    "autoRouted": false,
    "firstToolPath": "code_execution",
    "codeExecutionAttempts": 2,
    "recoveryAttemptCount": 1,
    "terminalState": "success"
  },
  "recovery": {
    "eligible": true,
    "attempted": true,
    "failureClass": "missing-await"
  }
}
```

### Recipe workflows

Recipe workflows are bounded Python scripts that compose PTC helpers (`batch_tool`, `first_success`, `reduce_tool`, `fit_output`, etc.) to solve adjacent-repo analysis tasks. They prove that `pi-ptc-next` orchestration helpers compose into real multi-tool workflows without adding domain-specific logic to the extension itself.

Current recipes live under `.pi/evals/ptc/recipes/`:

| Workflow | Recipe File | Key PTC Helpers | Purpose |
|----------|-------------|-----------------|----------|
| graph | `graph-compact-ranking.py` | `reduce_tool`, `fit_output` | Ranked symbol-graph analysis with bounded reduction |
| web | `web-answer-comparison.py` | `batch_tool`, `extract_handles`, `fit_output` | Web-search answer comparison with handle-aware output |
| hashline | `hashline-anomaly-summary.py` | `batch_tool`, `fit_output` | Anchored file anomaly detection via batched read/grep |
| mixed | `codegraph-web-evidence-merge.py` | `first_success`, `extract_handles`, `fit_output` | Cross-source evidence merge (codegraph + web) |

Each recipe uses `ptc.fit_output(...)` as the final bounded return step so large intermediate tool results stay local to Python.

Run the recipe benchmark subset using the same CLI documented above:

```bash
node dist/run-benchmarks.js \
  --provider local \
  --model seeded \
  --evals-path .pi/evals/ptc \
  --baseline .pi/evals/ptc/baselines/local__seeded__recipes.json
```

The deterministic recipe-only baseline at `.pi/evals/ptc/baselines/local__seeded__recipes.json` covers all four workflow types.

To add a new recipe:
1. Create a seeded eval case with `recipe_target` metadata under `.pi/evals/ptc/cases/`
2. Add the `.py` recipe artifact under `.pi/evals/ptc/recipes/` using only PTC helpers (no domain-specific imports)
3. Run `node --test test/eval-cases.test.ts test/recipe-ecosystem-proof.test.ts` to verify alignment
## Further reading

- Technical findings and implementation notes: [`docs/PTC-RESEARCH.md`](docs/PTC-RESEARCH.md)
- Anthropic advanced tool use snapshot: [`docs/advanced-tool-use.md`](docs/advanced-tool-use.md)
- Anthropic PTC docs snapshot: [`docs/programmatic-tool-calling.md`](docs/programmatic-tool-calling.md)

## Metrics

Completed `code_execution` runs now record local nested execution stats, including:

- nested tool call count
- nested tool names
- nested result count
- nested result character volume
- estimated avoided tokens
- total duration

These metrics are stored in tool result details for benchmarking and debugging.

### Measured token savings

On the benchmark task of analyzing the first 8 `test/**/*.test.ts` files and returning compact JSON only, `pi-ptc` materially reduced token consumption by keeping intermediate file contents inside Python instead of sending them back through ordinary tool results.

Observed averages in this environment:

- GPT-5.4: `20,294.5` tokens with `pi-ptc` vs `88,158` without it (`76.98%` reduction)
- GLM-5: `16,973` tokens with `pi-ptc` vs `33,100` without it (`48.72%` reduction)

The exact totals vary by model behavior and tool strategy, but both model families successfully used `code_execution`, which demonstrates the provider-agnostic design in practice.

## Development

```bash
npm run build
node --test test/hashline-interop-smoke.test.ts
npm test
```

## Troubleshooting

### `asyncio.run() cannot be called from a running event loop`

Remove `asyncio.run(...)` from model-generated Python. Top-level `await` is already available.

### Tool not callable from Python

Check one of these:

- the tool is blocked by policy
- it is mutating and `PTC_ALLOW_MUTATIONS` is disabled
- it is a custom/extension tool without `ptc.callable: true` (legacy `ptc.enabled: true` still works)

### Why did Python get a list instead of text?

That is intentional for tools like `find`, `glob`, `ls`, and `grep`. The runtime normalizes those into structured values to improve cross-model reliability.

## License

MIT
