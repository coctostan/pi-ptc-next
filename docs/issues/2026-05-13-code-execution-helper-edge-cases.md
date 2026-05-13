# Issue: Tighten code_execution helper docs and runtime edge cases

Date: 2026-05-13

## Summary

Follow-up from live manual testing of the recent `code_execution` helper additions.

GitHub issues are disabled for this repository, so this local issue note records the actionable follow-up.

Tracking milestone: **Milestone 19 — Live Runtime Helper Hardening** (`0.18.0`), phases 54–57 in `.paul/ROADMAP.md`.

## Observed issues / tighten-up areas

1. `ptc.run_tests(pattern)` is present in the live runtime, but in the current `code_execution` sandbox it returns `runner_available: false` because `node` is not available.
   - This matches the documented graceful fallback, but it makes the helper non-operational for actual Node test execution in the default/live sandbox where it is advertised.
   - Decide whether to add Node to the runtime image/session, gate the helper behind runner availability, or make the prompt/docs more explicit that it may only produce runner-unavailable reports depending on sandbox setup.

2. Callable tool wrappers exposed to Python appear async in live use.
   - `grep(...)`, `glob(...)`, and `read(...)` returned coroutine behavior until called with `await`.
   - The generated callable-tool surface/signatures currently read like synchronous functions in some prompt/docs contexts.
   - Tighten generated guidance and README examples so users consistently know when to use `await` for callable tools versus synchronous `ptc.*` helpers.

3. Callable tool wrappers reject positional arguments.
   - Example: `grep('pattern', path='README.md')` raised `TypeError: grep() takes 0 positional arguments but 1 was given`.
   - This may be intentional for schema alignment, but it is stricter than normal Python ergonomics and easy to trip over.
   - Consider either documenting keyword-only usage prominently or accepting obvious first positional arguments for simple tools.

4. `ptc.list_callable_tools()` correctly lists callable Pi tools, not `ptc` runtime helpers.
   - This is semantically correct, but easy to misread when users are checking for helper availability such as `ptc.run_tests`.
   - Consider adding `ptc.list_helpers()` or documenting the distinction more explicitly.

5. Positional-argument behavior is inconsistent across wrappers.
   - `read('README.md', limit=1)` succeeded.
   - `glob('test/*.test.ts')` succeeded.
   - `grep('ptc.run_tests', path='README.md')` rejected positional arguments.
   - Tighten generated signatures/docs, or normalize wrapper ergonomics consistently.

6. `ptc.read_many([...])` does not raise on missing files.
   - A missing file returned an error payload converted into a string entry, alongside successful file contents.
   - This may be useful partial behavior, but it is surprising for a helper documented as returning `list[str]`; document it or expose an explicit partial/error envelope.

7. Structured result path normalization is inconsistent.
   - Direct `read()` returns an absolute host path in the structured result.
   - Direct `grep()` normalized paths to relative paths in the tested case.
   - `ptc.batch_tool()` with `grep` returned an absolute path in the nested result sample.
   - Consider applying the same path-normalization policy across direct wrappers, helper wrappers, and batched tool results.

8. Direct callable wrapper result shapes can differ from the generated type hints when active tools return `details.ptcValue`.
   - For example, direct `find()` and `ls()` returned structured `{ entries: [...] }` objects in live testing, while generated helper summaries suggest list-like returns.
   - The `details.ptcValue` override rule is documented, but this should be more prominent near the callable surface/signatures because it materially changes expected Python handling.

9. `ptc.run_tests` command metadata joins argv with spaces.
   - A pattern containing spaces is safe because subprocess uses an argv list, but `metrics.command` renders `node --test test/name with spaces.test.js`, which is ambiguous and looks shell-like.
   - Consider returning `command_argv` or shell-quoted display text.

10. `ptc.batch_tool(..., on_error='collect')` can classify tool-level error payloads as successful calls.
   - A missing `read` target produced a `batch_partial` result with outer `ok: true` and `stats.succeeded: 1`, while the nested value was `{ ok: false, error: ... }`.
   - Consider detecting normalized tool error payloads, or document that `batch_tool` only treats transport/Python exceptions as failed and leaves tool-level failures to callers.

## Acceptance ideas

- Live `code_execution` prompt/help text clearly distinguishes:
  - async callable Pi tool wrappers (`await read(...)`, `await grep(...)`, etc.)
  - synchronous `ptc.*` helper methods (`ptc.report(...)`, `ptc.run_tests(...)`, etc.)
- `ptc.run_tests` either works in the default advertised runtime or its unavailable state is clearly presented as environment-dependent.
- Tests/docs cover positional-argument rejection or supported positional shorthand.
- Path normalization is consistent across direct wrappers and batched helper results, or the differences are explicitly documented.
- Tool-level failures in batched calls are either counted as failures or clearly documented as successful transport calls carrying failed tool payloads.
- Add at least one live/manual-style regression case for helper availability and runner-unavailable behavior.
