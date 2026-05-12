import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("README orchestration helper guidance stays aligned with the shipped runtime helper surface", () => {
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
  const runtimeSource = readFileSync(new URL("../src/python-runtime/runtime.py", import.meta.url), "utf8");

  assert.match(runtimeSource, /async def batch_tool\([\s\S]*on_error: str \| None = None,[\s\S]*\) -> Any:/);
  assert.match(runtimeSource, /async def first_success\(self, calls: Sequence\[dict\[str, Any\]\], max_concurrency: int \| None = None\) -> Any:/);
  assert.match(runtimeSource, /async def reduce_tool\(/);
  assert.match(runtimeSource, /def fit_output\(/);

  assert.match(readme, /await ptc\.batch_tool\(calls, max_concurrency=None, on_error=None\) -> list\[Any\] \| dict\[str, Any\]/);
  assert.match(readme, /on_error='collect'.*kind="batch_partial"/);
  assert.match(readme, /await ptc\.first_success\(calls, max_concurrency=None\) -> Any/);
  assert.match(readme, /await ptc\.reduce_tool\(calls, reducer, initial, max_concurrency=None\) -> Any/);
  assert.match(readme, /ptc\.fit_output\(value, max_chars=None, max_items=None, max_depth=None\) -> dict\[str, Any\]/);
  assert.match(runtimeSource, /def report\([\s\S]*title: str,[\s\S]*metrics: dict\[str, Any\] \| None = None,[\s\S]*\) -> dict\[str, Any\]:/);
  assert.match(readme, /ptc\.report\(title, metrics=None, tables=None, samples=None, warnings=None\) -> dict\[str, Any\]/);
  assert.match(readme, /recognized reports get richer completed tool-result rendering and `details\.report`/);
  assert.match(readme, /Use orchestration helpers when you have repeated multi-tool calls, ordered fallback logic, or large intermediate results that should stay local to Python\./);
  assert.match(readme, /For one simple tool call, call the tool directly\./);
  assert.match(readme, /Hashline-style reduction example:/);
  assert.match(readme, /searches = await ptc\.batch_tool\(/);
  assert.match(readme, /summary = await ptc\.reduce_tool\(/);
  assert.match(readme, /Codegraph-style ordered fallback example:/);
  assert.match(readme, /graph_result = await ptc\.first_success\(/);
  assert.match(readme, /Web-handle follow-up with bounded output example:/);
  assert.match(readme, /return ptc\.fit_output\(payload, max_chars=1500, max_items=3, max_depth=3\)/);
});
