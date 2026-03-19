const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const { Type } = require("@sinclair/typebox");

function stringParamSchema() {
  return Type.Object({
    value: Type.String(),
  });
}

function createToolResult(text) {
  return { content: [{ type: "text", text }], details: undefined };
}

function createStubTool(name, description) {
  return {
    name,
    description,
    parameters: stringParamSchema(),
    async execute() {
      return createToolResult(`builtin:${name}`);
    },
  };
}

function loadToolRegistryWithStubbedHost() {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === "@mariozechner/pi-coding-agent") {
      return {
        createReadTool: () => createStubTool("read", "read"),
        createBashTool: () => createStubTool("bash", "bash"),
        createEditTool: () => createStubTool("edit", "edit"),
        createWriteTool: () => createStubTool("write", "write"),
        createGrepTool: () => createStubTool("grep", "grep"),
        createFindTool: () => createStubTool("find", "find"),
        createLsTool: () => createStubTool("ls", "ls"),
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

test("active hashline ptc metadata controls callable exposure and normalized tool metadata", () => {
  const registry = createRegistry({
    getAllTools() {
      return [
        {
          name: "read",
          description: "override:read",
          parameters: stringParamSchema(),
          ptc: {
            callable: true,
            policy: "read-only",
            readOnly: true,
            pythonName: "read",
            defaultExposure: "safe-by-default",
          },
          async execute() {
            return createToolResult("ok");
          },
        },
        {
          name: "grep",
          description: "override:grep",
          parameters: stringParamSchema(),
          ptc: {
            callable: true,
            policy: "read-only",
            readOnly: true,
            pythonName: "grep",
            defaultExposure: "safe-by-default",
          },
          async execute() {
            return createToolResult("ok");
          },
        },
        {
          name: "sg",
          description: "override:sg",
          parameters: stringParamSchema(),
          ptc: {
            callable: true,
            policy: "read-only",
            readOnly: true,
            pythonName: "sg",
            defaultExposure: "opt-in",
          },
          async execute() {
            return createToolResult("ok");
          },
        },
        {
          name: "edit",
          description: "override:edit",
          parameters: stringParamSchema(),
          ptc: {
            callable: true,
            policy: "mutating",
            readOnly: false,
            pythonName: "edit",
            defaultExposure: "not-safe-by-default",
          },
          async execute() {
            return createToolResult("ok");
          },
        },
      ];
    },
    getActiveTools() {
      return ["read", "grep", "sg", "edit"];
    },
  });

  const allTools = registry.getAllTools(process.cwd());
  const tools = Object.fromEntries(allTools.map((tool) => [tool.name, tool]));

  assert.deepEqual(
    {
      pythonName: tools.read.ptc?.pythonName,
      policy: tools.read.ptc?.policy,
      readOnly: tools.read.ptc?.readOnly,
      defaultExposure: tools.read.ptc?.defaultExposure,
      isReadOnly: tools.read.isReadOnly,
    },
    {
      pythonName: "read",
      policy: "read-only",
      readOnly: true,
      defaultExposure: "safe-by-default",
      isReadOnly: true,
    }
  );

  assert.deepEqual(
    {
      pythonName: tools.grep.ptc?.pythonName,
      policy: tools.grep.ptc?.policy,
      readOnly: tools.grep.ptc?.readOnly,
      defaultExposure: tools.grep.ptc?.defaultExposure,
      isReadOnly: tools.grep.isReadOnly,
    },
    {
      pythonName: "grep",
      policy: "read-only",
      readOnly: true,
      defaultExposure: "safe-by-default",
      isReadOnly: true,
    }
  );

  assert.deepEqual(
    {
      pythonName: tools.sg.ptc?.pythonName,
      policy: tools.sg.ptc?.policy,
      readOnly: tools.sg.ptc?.readOnly,
      defaultExposure: tools.sg.ptc?.defaultExposure,
      isReadOnly: tools.sg.isReadOnly,
    },
    {
      pythonName: "sg",
      policy: "read-only",
      readOnly: true,
      defaultExposure: "opt-in",
      isReadOnly: true,
    }
  );

  assert.deepEqual(
    {
      pythonName: tools.edit.ptc?.pythonName,
      policy: tools.edit.ptc?.policy,
      readOnly: tools.edit.ptc?.readOnly,
      defaultExposure: tools.edit.ptc?.defaultExposure,
      isReadOnly: tools.edit.isReadOnly,
    },
    {
      pythonName: "edit",
      policy: "mutating",
      readOnly: false,
      defaultExposure: "not-safe-by-default",
      isReadOnly: false,
    }
  );

  const defaultCallable = registry.getCallableTools(process.cwd(), baseSettings({ allowMutations: true }));
  assert.ok(defaultCallable.some((tool) => tool.name === "read" && tool.ptc?.pythonName === "read" && tool.isReadOnly === true));
  assert.ok(defaultCallable.some((tool) => tool.name === "grep" && tool.ptc?.pythonName === "grep" && tool.isReadOnly === true));
  assert.ok(defaultCallable.some((tool) => tool.name === "edit" && tool.ptc?.pythonName === "edit" && tool.isReadOnly === false));
  assert.equal(defaultCallable.some((tool) => tool.name === "sg"), false);

  const optInCallable = registry.getCallableTools(
    process.cwd(),
    baseSettings({ allowMutations: true, callableTools: ["read", "grep", "sg", "edit"] })
  );
  assert.ok(optInCallable.some((tool) => tool.name === "sg" && tool.ptc?.pythonName === "sg" && tool.isReadOnly === true));

  const readonlyCallable = registry.getCallableTools(
    process.cwd(),
    baseSettings({
      allowMutations: false,
      callableTools: ["read", "grep", "sg", "edit"],
      trustedReadOnlyTools: ["sg"],
    })
  );
  assert.ok(readonlyCallable.some((tool) => tool.name === "read"));
  assert.ok(readonlyCallable.some((tool) => tool.name === "grep"));
  assert.ok(readonlyCallable.some((tool) => tool.name === "sg"));
  assert.equal(readonlyCallable.some((tool) => tool.name === "edit"), false);
});
