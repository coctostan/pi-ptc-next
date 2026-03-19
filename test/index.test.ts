const test: typeof import("node:test").test = module.require("node:test");
import type {} from "node:test";
const assert: typeof import("node:assert/strict") = module.require("node:assert/strict");

type SessionHandler = (...args: unknown[]) => unknown | Promise<unknown>;

type RegisteredTool = {
  name: string;
  description: string;
  [key: string]: unknown;
};

function setModuleExports(modulePath: string, exportsValue: unknown): () => void {
  const resolved = require.resolve(modulePath);
  const previous = require.cache[resolved];
  require.cache[resolved] = {
    id: resolved,
    filename: resolved,
    loaded: true,
    exports: exportsValue,
  } as unknown as NodeJS.Module;

  return () => {
    if (previous) {
      require.cache[resolved] = previous;
    } else {
      delete require.cache[resolved];
    }
  };
}

test("ptc extension bootstraps and cleans up runtime components", async () => {
  const sandbox = {
    cleanupCalls: 0,
    spawn() {
      throw new Error("sandbox spawn should not be used in bootstrap test");
    },
    getRuntimeWorkspaceRoot(cwd: string) {
      return cwd;
    },
    async cleanup() {
      this.cleanupCalls += 1;
    },
  };

  type FakeCustomToolManagerInstance = {
    extensionRoot: string;
    pi: unknown;
    toolRegistry: unknown;
    onToolSetChanged: () => void;
    started: number;
    closed: number;
  };

  type FakeCodeExecutorInstance = {
    sandboxManager: unknown;
    toolRegistry: unknown;
    settings: unknown;
    extensionRoot: string;
  };

  let managerInstance: FakeCustomToolManagerInstance = {
    extensionRoot: "",
    pi: null,
    toolRegistry: null,
    onToolSetChanged: () => undefined,
    started: 0,
    closed: 0,
  };
  let managerInitialized = false;
  let codeExecutorInstance: FakeCodeExecutorInstance = {
    sandboxManager: null,
    toolRegistry: null,
    settings: null,
    extensionRoot: "",
  };
  let codeExecutorInitialized = false;
  class FakeCustomToolManager {
    extensionRoot: string;
    pi: unknown;
    toolRegistry: unknown;
    onToolSetChanged: () => void;
    started: number;
    closed: number;

    constructor(extensionRoot: string, pi: unknown, toolRegistry: unknown, onToolSetChanged: () => void) {
      this.extensionRoot = extensionRoot;
      this.pi = pi;
      this.toolRegistry = toolRegistry;
      this.onToolSetChanged = onToolSetChanged;
      this.started = 0;
      this.closed = 0;
      managerInstance = this;
      managerInitialized = true;
    }

    async start() {
      this.started += 1;
      this.onToolSetChanged();
    }

    close() {
      this.closed += 1;
    }
  }

  class FakeToolRegistry {
    pi: unknown;

    constructor(pi: unknown) {
      this.pi = pi;
    }

    getCallableTools() {
      return [];
    }
  }

  class FakeCodeExecutor {
    sandboxManager: unknown;
    toolRegistry: unknown;
    settings: unknown;
    extensionRoot: string;

    constructor(sandboxManager: unknown, toolRegistry: unknown, settings: unknown, extensionRoot: string) {
      this.sandboxManager = sandboxManager;
      this.toolRegistry = toolRegistry;
      this.settings = settings;
      this.extensionRoot = extensionRoot;
      codeExecutorInstance = this;
      codeExecutorInitialized = true;
    }

    async execute() {
      return {
        output: "ok",
        details: {
          nestedToolCalls: 0,
          nestedToolNames: [],
          nestedResultChars: 0,
          nestedResultCount: 0,
          nestedErrors: 0,
          durationMs: 1,
          estimatedAvoidedTokens: 0,
        },
      };
    }
  }

  const restoreSandbox = setModuleExports("../dist/sandbox-manager.js", {
    createSandbox: async () => sandbox,
  });
  const restoreManager = setModuleExports("../dist/custom-tool-manager.js", {
    CustomToolManager: FakeCustomToolManager,
  });
  const restoreRegistry = setModuleExports("../dist/tool-registry.js", {
    ToolRegistry: FakeToolRegistry,
  });
  const restoreExecutor = setModuleExports("../dist/code-executor.js", {
    CodeExecutor: FakeCodeExecutor,
  });

  try {
    delete require.cache[require.resolve("../dist/index.js")];
    const extensionModule = require("../dist/index.js");
    const ptcExtension = extensionModule.default || extensionModule;

    const eventHandlers = new Map<string, SessionHandler>();
    const registered: RegisteredTool[] = [];
    const pi = {
      registerTool(tool: RegisteredTool) {
        registered.push(tool);
      },
      on(event: string, handler: SessionHandler) {
        eventHandlers.set(event, handler);
      },
      getAllTools() {
        return [];
      },
      getActiveTools() {
        return [];
      },
      setActiveTools() {},
    };

    await ptcExtension(pi);

    const onSessionStart = eventHandlers.get("session_start");
    if (!onSessionStart) {
      throw new Error("session_start handler not registered");
    }
    await onSessionStart({}, { cwd: process.cwd() });
    const codeExecutionTools = registered.filter((tool) => tool.name === "code_execution");
    assert.ok(codeExecutionTools.length >= 1);
    const latestCodeExecutionTool = codeExecutionTools[codeExecutionTools.length - 1];
    assert.ok(latestCodeExecutionTool);
    assert.match(latestCodeExecutionTool.description, /ptc\.read_many.*-> list\[str\]/i);
    assert.match(latestCodeExecutionTool.description, /ptc\.read_text.*-> str/);
    assert.match(latestCodeExecutionTool.description, /Prefer these for string content/);
    assert.match(latestCodeExecutionTool.description, /Use read\(path\) directly when you need structured anchored data/);
    assert.match(latestCodeExecutionTool.description, /Do not call _rpc_call/);
    assert.doesNotMatch(latestCodeExecutionTool.description, /details\.ptcValue/);
    assert.doesNotMatch(latestCodeExecutionTool.description, /PTC_BLOCKED_TOOLS/);
    assert.equal(codeExecutorInitialized, true);
    assert.equal(managerInstance.started, 1);
    assert.equal(codeExecutorInstance.sandboxManager, sandbox);
    const onSessionShutdown = eventHandlers.get("session_shutdown");
    if (!onSessionShutdown) {
      throw new Error("session_shutdown handler not registered");
    }
    await onSessionShutdown();
    assert.equal(managerInstance.closed, 1);
    assert.equal(sandbox.cleanupCalls, 1);
  } finally {
    restoreSandbox();
    restoreManager();
    restoreRegistry();
    restoreExecutor();
    delete require.cache[require.resolve("../dist/index.js")];
  }
});
