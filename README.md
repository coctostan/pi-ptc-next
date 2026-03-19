# pi-ptc-next

`pi-ptc-next` adds a provider-agnostic `code_execution` tool to pi. The model writes Python code, Python calls local pi tools through an internal RPC bridge, and only the final Python output is returned to the model context.

This is **not** Anthropic's provider-native PTC wire protocol. Instead, it implements the same core local behavior in a way that can work across multiple labs and models such as GPT-5.4, GLM-5, and Claude-class models.

## Fork history and credits

This repository started from the original [`cegersdoerfer/pi-ptc`](https://github.com/cegersdoerfer/pi-ptc) by [@cegersdoerfer](https://github.com/cegersdoerfer) (Chris Egersdoerfer).

This fork exists because I wanted to keep pushing the extension toward a more provider-agnostic and production-ready local PTC implementation for pi instead of a Claude-leaning prototype.

The main work done here includes:

- refactoring the codebase into clearer execution, contract, and tool submodules
- replacing the split loader/watcher flow with an authoritative custom tool manager
- tightening the runtime protocol and execution error boundaries
- making subprocess execution explicit opt-in and improving Docker behavior
- adding direct behavioral tests for the core execution/runtime/tooling paths
- improving package loading, vendoring local reference material for PTC/advanced tool use, and benchmarking real pi usage

If you are looking for the original version or the starting point for this fork, please see the upstream repository above.

## Installation

Install directly from GitHub:

```bash
pi install git:github.com/edxeth/pi-ptc-next
```

This fork is published publicly as **pi-ptc-next** to distinguish it from the original `pi-ptc` repository while preserving clear attribution to Chris Egersdoerfer's upstream work.
## Combined stack quick start

If you are pairing this extension with `pi-hashline-readmap`, use these docs together:

- `docs/hashline-integration/START-HERE.md` — recommended combined setup and policy guidance
- `docs/hashline-integration/DEMO.md` — canonical search -> inspect -> edit walkthrough
- `docs/hashline-integration/HARNESS-EVALUATION.md` — why the lightweight smoke proof is currently the preferred verification point

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

## Available Python functions

By default, Python code inside `code_execution` can call a safe built-in subset:

- `read(path, *, offset=None, limit=None, symbol=None, map=None) -> Union[str, ReadResult]`
- `glob(pattern, path='.', limit=1000) -> list[str]`
- `find(pattern, path='.', limit=1000) -> list[str]`
- `grep(...) -> Union[List[GrepMatch], GrepResult]`
- `ls(path='.', limit=500) -> list[str]`

Optional tools can be enabled via environment/config policy:

- `sg(pattern, *, lang=None, path=None) -> SgResult` (requires explicit opt-in via `PTC_CALLABLE_TOOLS=...,sg`)
- `bash(...) -> dict`
- `edit(...) -> AnchoredEditResult`
- `write(...) -> dict`

Custom and extension tools are **not callable from Python by default**. Prefer `ptc.callable: true` to opt in and `ptc.policy: "read-only" | "mutating"` to describe safety traits (legacy `ptc.enabled` / `ptc.readOnly` still work).

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
      "hash": "bf",
      "anchor": "45:bf",
      "raw": "export function createDemoDirectory(): UserDirectory {",
      "display": "export function createDemoDirectory(): UserDirectory {"
    },
    {
      "line": 46,
      "hash": "9a",
      "anchor": "46:9a",
      "raw": "  const directory = new UserDirectory(500);",
      "display": "  const directory = new UserDirectory(500);"
    },
    {
      "line": 47,
      "hash": "c3",
      "anchor": "47:c3",
      "raw": "  directory.addUser(\"Ada Lovelace\", \"ada@example.com\");",
      "display": "  directory.addUser(\"Ada Lovelace\", \"ada@example.com\");"
    },
    {
      "line": 48,
      "hash": "e1",
      "anchor": "48:e1",
      "raw": "  return directory;",
      "display": "  return directory;"
    },
    {
      "line": 49,
      "hash": "18",
      "anchor": "49:18",
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
      "hash": "7e",
      "anchor": "44:7e",
      "kind": "context",
      "raw": "// This keeps fixture size stable for truncation-threshold coverage.",
      "display": "// This keeps fixture size stable for truncation-threshold coverage."
    },
    {
      "path": "tests/fixtures/small.ts",
      "line": 45,
      "hash": "bf",
      "anchor": "45:bf",
      "kind": "match",
      "raw": "export function createDemoDirectory(): UserDirectory {",
      "display": "export function createDemoDirectory(): UserDirectory {"
    },
    {
      "path": "tests/fixtures/small.ts",
      "line": 46,
      "hash": "9a",
      "anchor": "46:9a",
      "kind": "context",
      "raw": "  const directory = new UserDirectory(500);",
      "display": "  const directory = new UserDirectory(500);"
    }
  ]
}
```

```json
{
  "tool": "sg",
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
          "hash": "10",
          "anchor": "2:10",
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
  "diff": "2:bd|const two = 2; → 2:86|const two = 22;",
  "firstChangedLine": 2,
  "warnings": [],
  "noopEdits": []
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

## Python helpers

The runtime also exposes a `ptc` helper object:

- `await ptc.gather_limit(coros, limit=8)`
- `await ptc.read_many(paths, max_concurrency=None, offset=None, line_limit=None)`
- `await ptc.read_tree(pattern, path='.', max_files=1000, concurrency=None, offset=None, line_limit=None)`
- `await ptc.find_files(pattern, path='.', max_files=1000)`
- `await ptc.find_files_abs(pattern, path='.', max_files=1000)`
- `await ptc.read_text(path, offset=None, limit=None)`
- `ptc.json_dump(value)`

Example:

```python
entries = await ptc.read_tree(pattern="**/*.ts", path="src", concurrency=6)
return {
    "files": len(entries),
    "sample_lengths": [len(entry["content"]) for entry in entries[:3]],
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
}
```

Legacy `ptc.enabled: true` / `ptc.readOnly: true` still work, but new docs and examples prefer `ptc.callable` / `ptc.policy`.

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
- `PTC_TRUSTED_READ_ONLY_TOOLS=query_db,fetch_metadata` — allowlisted custom tools treated as read-only when mutations are disabled
- `PTC_CALLABLE_TOOLS=read,glob,find,grep,ls` — explicit allowlist override
- `PTC_BLOCKED_TOOLS=bash,write` — explicit denylist override

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
