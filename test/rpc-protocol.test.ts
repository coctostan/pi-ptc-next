// @ts-nocheck
const test = module.require("node:test");
const assert = module.require("node:assert/strict");
const { EventEmitter } = module.require("node:events");
const { PassThrough } = module.require("node:stream");
const { RpcProtocol } = module.require("../dist/rpc-protocol.js");
import type { ChildProcess } from "node:child_process";

class FakeProcess extends EventEmitter {
  stdin: InstanceType<typeof PassThrough>;
  stdout: InstanceType<typeof PassThrough>;
  stderr: InstanceType<typeof PassThrough>;
  exitCode: number | null;

  constructor() {
    super();
    this.stdin = new PassThrough();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.exitCode = null;
  }

  kill() {
    this.exitCode = 0;
    this.emit("exit", 0);
  }
}

const structuredReadValue = {
  path: "src/tool-adapters.ts",
  startLine: 1,
  endLine: 2,
  lines: [
    { anchor: "1:abc123", text: 'import type { NormalizedToolResult } from "./contracts/execution-types";' },
    { anchor: "2:def456", text: "" },
  ],
};

test("RpcProtocol normalizes nested tool results and reports details", async () => {
  const proc = new FakeProcess();
  let sent = "";
  const sentOnce = new Promise((resolve) => {
    proc.stdin.on("data", (chunk: Buffer) => {
      sent += chunk.toString();
      resolve(undefined);
    });
  });

  const protocol = new RpcProtocol(
    proc as unknown as ChildProcess,
    async () => ({ content: [{ type: "text", text: "a.ts\nb.ts" }], details: undefined }),
    "result = await find(pattern='**/*.ts')"
  );

  proc.stdout.write(JSON.stringify({ type: "tool_call", id: "1", tool: "find", params: { pattern: "**/*.ts" } }) + "\n");
  await sentOnce;
  assert.match(sent, /"type":"tool_result"/);
  assert.match(sent, /"value":\["a.ts","b.ts"\]/);

  proc.stdout.write(JSON.stringify({ type: "complete", output: "done" }) + "\n");
  const result = await protocol.waitForCompletion();
  assert.equal(result.output, "done");
  assert.equal(result.details.nestedToolCalls, 1);
  assert.equal(result.details.nestedResultCount, 1);
});

test("RpcProtocol forwards details.ptcValue from nested tool results unchanged", async () => {
  const proc = new FakeProcess();
  let sent = "";
  const sentOnce = new Promise((resolve) => {
    proc.stdin.on("data", (chunk: Buffer) => {
      sent += chunk.toString();
      resolve(undefined);
    });
  });

  const protocol = new RpcProtocol(
    proc as unknown as ChildProcess,
    async () => ({
      content: [{ type: "text", text: "human-readable hashline output" }],
      details: { ptcValue: structuredReadValue },
    }),
    "result = await read(path='src/tool-adapters.ts')"
  );

  proc.stdout.write(JSON.stringify({ type: "tool_call", id: "1", tool: "read", params: { path: "src/tool-adapters.ts" } }) + "\n");
  await sentOnce;

  const frame = JSON.parse(sent.trim());
  assert.equal(frame.type, "tool_result");
  assert.deepEqual(frame.value, structuredReadValue);

  proc.stdout.write(JSON.stringify({ type: "complete", output: "done" }) + "\n");
  const result = await protocol.waitForCompletion();
  assert.equal(result.output, "done");
  assert.equal(result.details.nestedToolCalls, 1);
  assert.equal(result.details.nestedResultCount, 1);
});

test("RpcProtocol preserves framed stdout before the final result", async () => {
  const proc = new FakeProcess();
  const protocol = new RpcProtocol(proc as unknown as ChildProcess, async () => null, "print('hello')");

  proc.stdout.write(JSON.stringify({ type: "stdout", text: "hello\n" }) + "\n");
  proc.stdout.write(JSON.stringify({ type: "complete", output: "done" }) + "\n");

  const result = await protocol.waitForCompletion();
  assert.equal(result.output, "hello\ndone");
});

test("RpcProtocol rejects clean exits without a terminal protocol message", async () => {
  const proc = new FakeProcess();
  const protocol = new RpcProtocol(proc as unknown as ChildProcess, async () => null, "print('hello')");

  proc.emit("exit", 0);
  proc.stdout.end();

  await assert.rejects(protocol.waitForCompletion(), /before completing the RPC protocol/);
});

test("RpcProtocol surfaces pre-terminal Python syntax stderr as actionable execution errors", async () => {
  const proc = new FakeProcess();
  const protocol = new RpcProtocol(proc as unknown as ChildProcess, async () => null, "def broken(\nreturn 1");

  proc.stderr.write([
    "Traceback (most recent call last):",
    '  File "<string>", line 1',
    "    def broken(",
    "              ^",
    "SyntaxError: '(' was never closed",
  ].join("\n"));
  proc.emit("exit", 1);
  proc.stdout.end();

  await assert.rejects(protocol.waitForCompletion(), (err: any) => {
    assert.match(err.message, /Python execution error/);
    assert.match(err.message, /SyntaxError/);
    assert.match(err.message, /Traceback/);
    assert.ok(!err.message.includes("stdout closed"), `Expected actionable syntax context, got: ${err.message}`);
    return true;
  });
});

test("RpcProtocol keeps non-python stderr shutdowns as transport errors", async () => {
  const proc = new FakeProcess();
  const protocol = new RpcProtocol(proc as unknown as ChildProcess, async () => null, "print('hello')");

  proc.stderr.write("fatal: transport closed unexpectedly\n");
  proc.emit("exit", 1);
  proc.stdout.end();

  await assert.rejects(protocol.waitForCompletion(), (err: any) => {
    assert.match(err.message, /before completing the RPC protocol/);
    assert.match(err.message, /fatal: transport closed unexpectedly/);
    return true;
  });
});

test("RpcProtocol accepts a buffered complete frame that arrives after exit", async () => {
  const proc = new FakeProcess();
  const protocol = new RpcProtocol(proc as unknown as ChildProcess, async () => null, "print('hello')");

  proc.emit("exit", 0);
  proc.stdout.write(JSON.stringify({ type: "complete", output: "done" }) + "\n");
  proc.stdout.end();

  const result = await protocol.waitForCompletion();
  assert.equal(result.output, "done");
});

test("RpcProtocol rejects invalid JSON frames as protocol errors", async () => {
  const proc = new FakeProcess();
  const protocol = new RpcProtocol(proc as unknown as ChildProcess, async () => null, "print('hello')");

  proc.stdout.write("not-json\n");

  await assert.rejects(protocol.waitForCompletion(), /Invalid RPC message/);
});

test("RpcProtocol rejects unknown frame types", async () => {
  const proc = new FakeProcess();
  const protocol = new RpcProtocol(proc as unknown as ChildProcess, async () => null, "print('hello')");

  proc.stdout.write(JSON.stringify({ type: "mystery" }) + "\n");

  await assert.rejects(protocol.waitForCompletion(), /Unknown RPC frame type/);
});

test("RpcProtocol rejects malformed tool_call frames", async () => {
  const proc = new FakeProcess();
  const protocol = new RpcProtocol(proc as unknown as ChildProcess, async () => null, "print('hello')");

  proc.stdout.write(JSON.stringify({ type: "tool_call", id: 1, tool: "find", params: [] }) + "\n");

  await assert.rejects(protocol.waitForCompletion(), /Invalid tool_call frame/);
});
