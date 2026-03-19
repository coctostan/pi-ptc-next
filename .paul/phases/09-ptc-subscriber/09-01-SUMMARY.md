---
phase: 09-ptc-subscriber
plan: 01
completed: 2026-03-18T16:30:00Z
duration: ~15 minutes
---

## Objective
Add EventBus subscriber and `globalThis` pre-emit check to `ToolRegistry` so that hashline tool executors are overlaid onto builtins in `buildToolMap()`, routing nested PTC tool calls through the real hashline implementations.

## What Was Built
| File | Purpose | Lines changed |
|------|---------|---------------|
| `src/tool-registry.ts` | Added `extensionExecutors` field, constructor with `globalThis` check + EventBus subscription, `ingestExtensionExecutors()` method, and `buildToolMap()` overlay block | +35 |
| `test/tool-registry.test.ts` | Added 3 new tests (globalThis overlay, EventBus subscription, fallback preservation) + `events` stub in mock pi | +80 |
| `test/hashline-default-exposure.test.ts` | Added `events` stub to mock pi (required by new constructor) | +4 |
| `test/hashline-interop-smoke.test.ts` | Added `events` stub to mock pi | +4 |
| `test/hashline-real-interop.mjs` | Added `events` stub to mock pi | +4 |

## Acceptance Criteria Results
| AC | Description | Status | Evidence |
|----|-------------|--------|----------|
| AC-1 | Extension executors stored from EventBus and globalThis | PASS | Constructor reads `globalThis.__hashlineToolExecutors` at init, subscribes to `pi.events.on("hashline:tool-executors")`. Test A confirms globalThis path works. |
| AC-2 | buildToolMap overlays extension executors onto builtins | PASS | Overlay block at line 206 replaces builtin execute with extension executor while preserving original source for policy compliance. Test A confirms overlay produces hashline results. |
| AC-3 | Fallback preserved when no extension executors exist | PASS | Test C confirms builtin execute runs when no extension executors are present. All 9 pre-existing tool-registry tests still pass. |

## Verification Results
```text
$ npm run build
✓ Build successful

$ node --test test/tool-registry.test.ts
ℹ tests 12
ℹ pass 12
ℹ fail 0

$ npm test
ℹ tests 73
ℹ pass 73
ℹ fail 0
```

## Deviations
- **Overlay preserves original source field:** The plan specified `source: "extension"` on overlaid entries. During APPLY, this caused `getCallableTools()` to filter out overlaid builtins because `isBuiltin` became false and the tool wasn't in `trustedReadOnlyTools`. Fixed by keeping the existing `source` field — builtins overlaid with extension executors still behave as builtins for policy purposes.
- **4 existing test files updated:** The new `ToolRegistry` constructor calls `pi.events.on()`, so all mock pi objects across test files needed an `events: { on() {}, emit() {} }` stub. This is additive and non-breaking.

## Key Patterns / Decisions
- The `ingestExtensionExecutors()` method iterates `Object.entries()` to handle hashline's name-keyed payload shape (`{ read, edit, grep, sg }`).
- `globalThis` is the primary discovery path since hashline loads before PTC. The EventBus subscription is insurance for late/dynamic re-registration.
- Overlay goes between builtins and customTools in `buildToolMap()`, before the `pi.getAllTools()` loop, so metadata from `pi.getAllTools()` can still enrich the entry.
- Bridge code is marked with "Remove when pi exposes getToolExecutor() on ExtensionAPI" and grep marker `"hashline:tool-executors"`.

## Next Phase
Phase 9 is complete. Next: `/paul:plan` for Phase 10 — Live Verification and Teardown.
