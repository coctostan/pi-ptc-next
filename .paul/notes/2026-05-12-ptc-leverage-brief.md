# PTC Leverage Brief — Post-Milestone 17

**Date:** 2026-05-12
**Status:** Pre-planning notes for the milestone after Milestone 17. Not a plan or roadmap entry — discussion artifact only.
**Author:** Conversational pass with Claude after Milestone 17 close.

## Thesis

> **PTC's job is to convert "I need to know X about this repo / dataset" into a small, well-shaped answer, with minimum agent friction.**

Every enhancement is judged against three axes:

1. **Output noise / shape** — does the call return something compact, structured, and renderable?
2. **Per-call Python boilerplate** — does the agent spend tokens expressing the question, or computing the answer?
3. **Tool-choice signal** — does the agent pick the right tool (PTC vs. `nu` vs. direct) and the right sub-tool (`grep` vs. `read` vs. helper) without thrashing?

Caching, persistence, and cross-call session state are **deferred**. They optimize a narrower pattern (iterative re-analysis) and carry the most design risk (invalidation, scoping, worktrees). Revisit only after the leverage features below have shipped and we have evidence of the remaining friction.

## Context: complementary tools

PTC does not exist in isolation. The agent also has `nu` (Nushell pipelines) available. Their roles partition cleanly:

- **`nu`** — pipeline-style analysis of *already-structured* data and filesystem metadata. Native table rendering. Terser for `where` / `sort-by` / `group-by` / `first` / `histogram` over tabular inputs.
- **`code_execution`** — custom per-item logic (regex over file contents), state across items (counters, graphs, dependency maps), results with shapes more complex than a table, and orchestration of multiple callable tools.

A side-effect feature for this milestone: a small **prompt-guidelines update teaching the agent to choose between `nu` and `code_execution`**. Cheap, immediate, complements Phase 47. Ships in any PR.

---

## Feature C — Structured report return type (`ptc.report(...)`)

**Priority:** P0 — the organizing principle for everything else in this milestone.

**Problem.** Today every `code_execution` returns a free-form dict. The UI cannot render it specially, telemetry cannot count its parts, and evals cannot score it. The agent has no convention for "what a result looks like" beyond "compact JSON."

**Proposal.** Introduce `ptc.report(...)` as a **soft contract**:
- Free-form returns continue to work unchanged.
- `ptc.report(...)` returns a recognized type with a known shape (title, scalar metrics, ranked lists / tables, samples, warnings).
- The TUI renders recognized reports specially (table/sparkline/inline summary).
- Telemetry counts produced reports separately from free-form returns.
- Evals can assert against the report shape.

**Key design hook:** the shape should be the **same shape `nu` already returns** (records/tables) so the TUI render path can be unified with `nu`-rendered output. Adopting an existing shape removes most design risk and produces visual consistency the user immediately recognizes.

**Open questions for plan-time:**
- Exact field set and required vs optional fields.
- Whether `ptc.report(...)` is a class, a typed dict, or a builder fluent API.
- TUI render pipeline: does `nu` output today go through a renderer we can reuse, or is a small abstraction needed?
- Backwards compatibility: legacy free-form dicts must continue to render as JSON.

**Cost estimate:** medium. New module + TUI renderer hook + tests + minor prompt-guideline addition. ~1 plan, scoped tightly.

---

## Feature A — Aggregator helpers (`top_n`, `group_by`, `histogram`, `tabulate`, `diff`)

**Priority:** P1 — value is real but **narrower than originally framed**, because `nu` already handles the pipeline-style cases natively.

**Revised scope.** Drop the redundant helpers; keep the ones with no clean `nu` equivalent or that bridge to C:

| Helper | Keep? | Rationale |
|---|---|---|
| `top_n(items, key, n)` | **Drop** | `nu`: `sort-by key \| first n` is equally short |
| `group_by(items, key)` | **Drop** | `nu`: `group-by key` is native |
| `histogram(values, bins=...)` | **Drop** | `nu`: `histogram` is native |
| `tabulate(rows, headers)` | **Keep** | Bridges Python intermediates into the C report shape |
| `diff(a, b)` | **Keep** | No clean `nu` equivalent; useful for "what changed since last run" |
| (project-specific verbs as they emerge) | **Keep** | E.g. internal-vs-external import count; ship as we identify them in real use |

**Open questions for plan-time:**
- Final helper list — what else has earned its place by being repeatedly hand-written?
- Whether helpers live under `ptc.*` or a new `ptc.report.*` namespace if they all bridge to C.

**Cost estimate:** small. Pure Python helpers + tests. ~½ plan, paired with C.

---

## Feature B — Relative-path option on file discovery

**Priority:** P2 — tiny ergonomic win, every fanout call.

**Problem.** `ptc.find_files_abs(...)` returns absolute paths. Every agent doing repo-relative output writes the same boilerplate:

```python
rel = path.split("pi-ptc-next/", 1)[-1]
```

**Proposal.** Add `relative=True` and/or `relative_to=<root>` to `ptc.find_files_abs(...)` and `ptc.find_files(...)`. Default behavior unchanged.

**Open questions for plan-time:**
- Default root: the sandbox workspace root (already known to the host via `getRuntimeWorkspaceRoot`).
- Whether to add the same option to `ptc.read_tree(...)` for consistency.

**Cost estimate:** trivial. Few lines + tests. Can ride with A or D as a freebie.

---

## Feature D — Callable-tool introspection (`ptc.help`, `promptSnippet` for callable tools)

**Priority:** P1 — high leverage for tool-choice signal *inside* code_execution.

**Problem.** Phase 47 made the agent's *outer* tool choice better (when to use `code_execution`). Inside `code_execution`, the agent sees the callable tool list (e.g. `read, grep, find, ls, glob`) but no per-tool guidance about when to prefer which. The metadata plumbing for `promptSnippet` / `promptGuidelines` already exists for direct tools — extending it inward is mostly wiring.

**Proposal.**
- Allow tools to optionally expose their `promptSnippet` / `promptGuidelines` through the callable surface.
- Add `ptc.help(tool_name)` returning that metadata at runtime, so agents can introspect without polluting their context with a giant tool description block.
- Document the convention; do not force every tool to provide it.

**Open questions for plan-time:**
- Where the metadata lives in the callable wrapper (today it's on the registered tool object).
- Whether `ptc.help()` returns text, a structured record, or a small report (likely a C-shape record).
- Default behavior when metadata is absent — empty string vs explicit "no guidance available."

**Cost estimate:** small. Plumbing extension of Phase 47 + tests + docs.

---

## Feature E — `ptc.run_tests(pattern)`

**Priority:** P2 — narrow but high-value verb that's awkward today.

**Problem.** Running `node --test` and inspecting structured failures from inside `code_execution` requires shelling out and parsing string output. Every agent reinvents the parser, badly.

**Proposal.** First-class verb that:
- Runs `node --test` (or the project's configured test runner) against a pattern.
- Parses pass/fail/duration into a structured record.
- Returns a C-shape report with a failures list and summary metrics.

**Open questions for plan-time:**
- Cross-runner support — start with `node --test` only, or include `vitest` / `jest` / `pytest`?
- Sandbox/Docker policy interaction — running tests inside the PTC sandbox vs. in the host.
- Mutation-prompt safety — running tests is read-only of source but may write coverage / cache artifacts.

**Cost estimate:** medium. New verb + runner-output parser + tests. Easier to scope after C lands because the return shape is already decided.

---

## Suggested sequencing

The leverage features have a natural dependency:

1. **C first** — defines the shape everything else returns.
2. **B alongside or before C** — trivial, removes boilerplate from every fanout example used while testing C.
3. **A (slimmed)** — depends on C for the bridge helpers; ship paired.
4. **D** — independent of C but benefits from C's shape for `ptc.help()` return.
5. **E last** — narrowest, benefits most from settled report shape.
6. **F (collapsible `code_execution` body)** — UI-only, can ride with C (both touch the render path) or ship as a standalone phase early.
7. **Prompt-guidelines update (nu vs. code_execution split)** — can ride with any phase, costs nothing.

This is a single milestone in scope (5–6 phases), or a milestone + handoff if we discover more during planning.

## Explicitly deferred

- Cross-call session state.
- Read cache by `(path, mtime)`.
- Persistence across Pi restarts.
- Most UI-side enhancements (telemetry chip, auto-route "why" indicator, tool-call tree drill-down, sandbox/safety badges, etc.) — covered in the agent/UI brainstorm but out of scope for this milestone, **except for Feature F below which is included**.

Revisit deferrals only after the leverage features have shipped and we have post-release evidence about which friction axis dominates next.

---

## Feature F — Post-completion code visibility (collapsible `code_execution` body)

**Priority:** P1 — small surface, real debugging gap, in scope for this milestone.

**Problem.** Today the TUI renders the executing Python live (`renderExecutingCode`, with a `→` cursor on the current line), but on completion `renderCompletedOutput` shows only the telemetry summary + result body. The code that ran is *discarded from the chat*, even though `details.userCode` is still populated on the completed result. There is no way after the fact to:

- See what the agent actually executed (debugging surprising results).
- Inspect the Python for learning / copying.
- Re-read it during a longer session without re-running the call.

**Proposal.** Adopt the collapsible-body pattern Pi already uses for its own tool calls:

- After completion, render the `code_execution` as a collapsible block.
- Collapsed form (default for non-trivial bodies): a one-line header summary, e.g. `▶ code_execution · 24 lines · 1.4s · ~8k tokens saved`.
- Expanded form: the full Python source with line numbers, mirroring `renderExecutingCode`'s formatting.
- Short bodies (≤ N lines, threshold to decide at plan-time) may render expanded by default.
- The telemetry summary line stays; the result body stays.

**Investigation task — Pi TUI possibilities.** Before designing the collapsible component, **investigate what Pi's TUI library (`@mariozechner/pi-tui` and any newer Pi extension UI hooks) already provides** that we can reuse instead of building bespoke. Specifically look for:

- Collapsible / disclosure components.
- Native table / record renderers (relevant to Feature C — match the rendering path `nu` and Pi's own tools use).
- Tool-call tree / nested-call rendering.
- Standard header-with-summary affordances.
- Theming hooks for muted/expanded states.
- Any new render protocol shipped with Pi `0.74.0` that we have not yet adopted.

The investigation outcome should land as a short note (`docs/` or a plan appendix) before implementation; if Pi provides usable primitives, prefer them over local reimplementations. This also informs Feature C's render hook and any future UI-side work.

**Open questions for plan-time:**

- Default collapsed/expanded threshold (lines of code, presence of nested tool calls, runtime duration?).
- Whether the collapsed summary header is configurable / themeable.
- Interaction with `isPartial` rendering — does the live `→` cursor view convert smoothly into the collapsed block on completion?
- Whether to also persist code to a forensic log file (`runs/ptc-<timestamp>-<hash>.py`) — out of scope unless cheap to ride along.

**Cost estimate:** small-to-medium. Pure UI change in `renderCompletedOutput` + a collapsible component (likely already provided by `pi-tui`, pending investigation) + tests for both render branches. ~½ plan; can ship paired with C since both touch rendering.
