// @ts-nocheck
const test = module.require("node:test");
const assert = module.require("node:assert/strict");
const Module = module.require("node:module");
const { Type } = module.require("@sinclair/typebox");
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

function loadToolRegistryWithStubbedHost() {
  const originalLoad = Module._load;
  Module._load = function (request: string, parent: unknown, isMain: boolean) {
    if (request === "@mariozechner/pi-coding-agent") {
      const createBuiltin = (name: string) => ({
        name,
        description: `builtin:${name}`,
        parameters: Type.Object({ path: Type.String() }),
        async execute() {
          return { content: [{ type: "text", text: `builtin:${name}` }] };
        },
      });

      return {
        createReadTool: () => createBuiltin("read"),
        createBashTool: () => createBuiltin("bash"),
        createEditTool: () => createBuiltin("edit"),
        createWriteTool: () => createBuiltin("write"),
        createGrepTool: () => createBuiltin("grep"),
        createFindTool: () => createBuiltin("find"),
        createLsTool: () => createBuiltin("ls"),
      };
    }

    return originalLoad(request, parent, isMain);
  };

  try {
    delete require.cache[require.resolve("../dist/tool-registry.js")];
    return require("../dist/tool-registry.js").ToolRegistry;
  } finally {
    Module._load = originalLoad;
  }
}

function createRegistry(piOverrides = {}) {
  const ToolRegistry = loadToolRegistryWithStubbedHost();
  const pi = {
    getAllTools() {
      return [];
    },
    getActiveTools() {
      return [];
    },
    events: {
      on() { return () => {}; },
      emit() {},
    },
    ...piOverrides,
  };
  return new ToolRegistry(pi);
}

function baseSettings(overrides = {}) {
  return {
    executionTimeoutMs: 1000,
    maxOutputChars: 1000,
    allowMutations: true,
    allowBash: false,
    maxParallelToolCalls: 4,
    useDocker: false,
    allowUnsandboxedSubprocess: true,
    debugLogging: false,
    trustedReadOnlyTools: undefined,
    callableTools: undefined,
    blockedTools: undefined,
    ...overrides,
  };
}

function readNextToolResultFrame(proc: FakeProcess): Promise<{ type: string; id: string; value?: unknown; error?: unknown }> {
  return new Promise((resolve, reject) => {
    proc.stdin.once("data", (chunk: Buffer) => {
      try {
        const line = chunk.toString().trim();
        resolve(JSON.parse(line));
      } catch (error) {
        reject(error);
      }
    });
  });
}

test("hashline interop smoke: active read/grep/edit overrides flow structured ptcValue through RPC", async () => {
  const structuredReadValue = {
    path: "README.md",
    startLine: 1,
    endLine: 2,
    lines: [
      { anchor: "1:abc123", text: "# pi-ptc-next" },
      { anchor: "2:def456", text: "" },
    ],
  };

  const structuredGrepValue = {
    matches: [{ path: "README.md", anchor: "83:xx11", line: 83, text: "## Structured override payloads (`details.ptcValue`)", kind: "match" }],
  };

  const structuredEditValue = {
    ok: true,
    files: ["README.md"],
    edits: [{ startAnchor: "83:xx11", endAnchor: "83:xx11", status: "applied" }],
  };

  const invocations: Array<{ tool: string; toolCallId: string; params: unknown; caller: unknown }> = [];

  const registry = createRegistry({
    getAllTools() {
      return [
        {
          name: "read",
          description: "override:read",
          parameters: Type.Object({ path: Type.String() }),
          async execute(toolCallId: string, params: unknown, _signal: unknown, _onUpdate: unknown, ctx: { caller?: unknown }) {
            invocations.push({ tool: "read", toolCallId, params, caller: ctx?.caller });
            return {
              content: [{ type: "text", text: "human-readable read output" }],
              details: { ptcValue: structuredReadValue },
            };
          },
        },
        {
          name: "grep",
          description: "override:grep",
          parameters: Type.Object({ pattern: Type.String(), path: Type.String() }),
          async execute(toolCallId: string, params: unknown, _signal: unknown, _onUpdate: unknown, ctx: { caller?: unknown }) {
            invocations.push({ tool: "grep", toolCallId, params, caller: ctx?.caller });
            return {
              content: [{ type: "text", text: "human-readable grep output" }],
              details: { ptcValue: structuredGrepValue },
            };
          },
        },
        {
          name: "edit",
          description: "override:edit",
          parameters: Type.Object({ path: Type.String(), anchor: Type.String() }),
          async execute(toolCallId: string, params: unknown, _signal: unknown, _onUpdate: unknown, ctx: { caller?: unknown }) {
            invocations.push({ tool: "edit", toolCallId, params, caller: ctx?.caller });
            return {
              content: [{ type: "text", text: "human-readable edit output" }],
              details: { ptcValue: structuredEditValue },
            };
          },
        },
      ];
    },
    getActiveTools() {
      return ["read", "grep", "edit"];
    },
  });

  const runtime = registry.createCallableToolRuntime(process.cwd(), baseSettings(), {
    ctx: { cwd: process.cwd() },
    parentToolCallId: "parent:smoke",
  });

  const callableNames = runtime.tools.map((tool) => tool.name);
  assert.ok(callableNames.includes("read"));
  assert.ok(callableNames.includes("grep"));
  assert.ok(callableNames.includes("edit"));
  assert.equal(runtime.tools.find((tool) => tool.name === "read")?.description, "override:read");

  const proc = new FakeProcess();
  const protocol = new RpcProtocol(
    proc as unknown as ChildProcess,
    runtime.runTool,
    "read_result = await read(path='README.md')\ngrep_result = await grep(pattern='ptcValue', path='README.md')\nedit_result = await edit(path='README.md', anchor='83:xx11')"
  );

  const readFramePromise = readNextToolResultFrame(proc);
  proc.stdout.write(JSON.stringify({ type: "tool_call", id: "nested-read", tool: "read", params: { path: "README.md" } }) + "\n");
  const readFrame = await readFramePromise;
  assert.equal(readFrame.type, "tool_result");
  assert.equal(readFrame.id, "nested-read");
  assert.deepEqual(readFrame.value, structuredReadValue);

  const grepFramePromise = readNextToolResultFrame(proc);
  proc.stdout.write(
    JSON.stringify({ type: "tool_call", id: "nested-grep", tool: "grep", params: { pattern: "ptcValue", path: "README.md" } }) + "\n"
  );
  const grepFrame = await grepFramePromise;
  assert.equal(grepFrame.type, "tool_result");
  assert.equal(grepFrame.id, "nested-grep");
  assert.deepEqual(grepFrame.value, structuredGrepValue);

  const editFramePromise = readNextToolResultFrame(proc);
  proc.stdout.write(
    JSON.stringify({ type: "tool_call", id: "nested-edit", tool: "edit", params: { path: "README.md", anchor: "83:xx11" } }) + "\n"
  );
  const editFrame = await editFramePromise;
  assert.equal(editFrame.type, "tool_result");
  assert.equal(editFrame.id, "nested-edit");
  assert.deepEqual(editFrame.value, structuredEditValue);

  proc.stdout.write(JSON.stringify({ type: "complete", output: "smoke-done" }) + "\n");
  const completion = await protocol.waitForCompletion();
  assert.equal(completion.output, "smoke-done");
  assert.equal(completion.details.nestedToolCalls, 3);
  assert.equal(completion.details.nestedResultCount, 3);
  assert.deepEqual(completion.details.nestedToolNames, ["read", "grep", "edit"]);

  assert.deepEqual(
    invocations.map((entry) => ({ tool: entry.tool, toolCallId: entry.toolCallId })),
    [
      { tool: "read", toolCallId: "nested-read" },
      { tool: "grep", toolCallId: "nested-grep" },
      { tool: "edit", toolCallId: "nested-edit" },
    ]
  );

  for (const invocation of invocations) {
    assert.deepEqual(invocation.caller, {
      type: "code_execution",
      parentToolCallId: "parent:smoke",
      nestedCallId: invocation.toolCallId,
    });
  }
});
