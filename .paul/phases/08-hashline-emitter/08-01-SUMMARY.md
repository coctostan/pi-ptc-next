---
phase: 08-hashline-emitter
plan: 01
completed: 2026-03-18T16:10:00Z
duration: ~5 minutes (verification only — work was already implemented)
---

## Objective
Modify the `pi-hashline-readmap` extension so it emits its tool executor functions on pi's EventBus after registration, making them discoverable by `pi-ptc-next` for nested tool call routing.

## What Was Built
| File | Purpose | Status |
|------|---------|--------|
| `pi-hashline-readmap/src/read.ts` | `registerReadTool` returns tool def after `pi.registerTool(tool)` | Already present |
| `pi-hashline-readmap/src/edit.ts` | `registerEditTool` returns tool def | Already present |
| `pi-hashline-readmap/src/grep.ts` | `registerGrepTool` returns tool def | Already present |
| `pi-hashline-readmap/src/sg.ts` | `registerSgTool` returns tool def | Already present |
| `pi-hashline-readmap/index.ts` | Captures return values, builds `toolExecutors` payload, emits on `pi.events.emit("hashline:tool-executors")`, stashes on `globalThis.__hashlineToolExecutors` | Already present |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Register functions return tool definitions | PASS | All 4 files have `return tool;` after `pi.registerTool(tool);` |
| AC-2 | EventBus emission | PASS | `index.ts` L40: `pi.events.emit("hashline:tool-executors", toolExecutors);` |
| AC-3 | globalThis stash for load-order safety | PASS | `index.ts` L39: `(globalThis as any).__hashlineToolExecutors = toolExecutors;` |

## Verification Results
```text
$ cd pi-hashline-readmap && npx tsc --noEmit
✓ Build successful

$ npm test
 Test Files  89 passed (89)
      Tests  432 passed (432)
   Duration  3.78s

$ grep "return tool;" src/read.ts src/edit.ts src/grep.ts src/sg.ts
  ✓ All 4 files confirmed

$ grep "hashline:tool-executors" index.ts
  ✓ EventBus emit confirmed

$ grep "__hashlineToolExecutors" index.ts
  ✓ globalThis stash confirmed
```

## Deviations
- **No code changes were needed** — the hashline repo already had all emitter work implemented. Phase 8 APPLY was purely verification.
- **Payload shape differs from bridge plan:** The actual payload is `{ read: toolDef, edit: toolDef, grep: toolDef, sg: toolDef }` (name-keyed object) rather than the `{ tools: [{ name, execute, ptc, parameters }, ...] }` array described in the original `eventbus-bridge-plan.md`. Phase 9's PTC subscriber must consume this shape.
- **Bridge marker comments ("Remove when pi exposes getToolExecutor()")** are not yet present in the hashline code. Can be added in Phase 10 alongside other teardown documentation.

## Key Patterns / Decisions
- The emitter uses a flat name-keyed object (`{ read, edit, grep, sg }`) rather than an array. This is simpler for the subscriber to consume by name lookup.
- `globalThis` stash is set _before_ the EventBus emit, ensuring the stash is always available even if no listener is registered yet.
- The emitter is part of the synchronous extension factory (`piHashlineReadmapExtension`), so it executes during pi's extension loading phase.

## Next Phase
Phase 8 is complete. Next: `/paul:plan` for Phase 9 — PTC Subscriber.
