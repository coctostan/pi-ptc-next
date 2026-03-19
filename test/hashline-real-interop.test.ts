const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const path = require("node:path");

test("real hashline interop harness runs sg -> read(symbol) -> edit -> grep through code_execution", () => {
  try {
    execFileSync("sg", ["--version"], { stdio: "ignore" });
  } catch {
    throw new Error("hashline-real-interop.test.ts requires ast-grep (`sg`) on PATH.");
  }
  const repoRoot = path.resolve(__dirname, "..");
  const stdout = execFileSync(
    "node",
    ["--experimental-transform-types", "test/hashline-real-interop.mjs"],
    { cwd: repoRoot, encoding: "utf8" }
  );
  const payload = JSON.parse(stdout);
  assert.deepEqual(payload.details.nestedToolNames, ["sg", "read", "edit", "grep"]);
  assert.equal(payload.output.search.tool, "sg");
  assert.equal(payload.output.read.tool, "read");
  assert.equal(payload.output.read.symbol.query, "demoTarget");
  assert.equal(payload.output.edit.tool, "edit");
  assert.equal(payload.output.edit.ok, true);
  assert.equal(payload.output.grep.tool, "grep");
  assert.ok(payload.output.grep.records.some((record: any) => record.raw.includes('const value = "after";')));
  assert.match(payload.fileText, /const value = "after";/);
  assert.ok(payload.output.search.files[0].lines.some((line: any) => line.raw.includes('const value = "before";')));
  assert.ok(payload.output.read.lines.some((line: any) => line.raw.includes('const value = "before";')));
});
