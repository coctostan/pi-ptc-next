const test: typeof import("node:test").test = module.require("node:test");
import type {} from "node:test";
const assert: typeof import("node:assert/strict") = module.require("node:assert/strict");

type SessionHandler = (...args: unknown[]) => unknown | Promise<unknown>;

type RegisteredTool = {
  name: string;
  description: string;
  promptSnippet?: string;
  promptGuidelines?: string[];
  execute: (...args: unknown[]) => unknown;
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

async function bootstrapPtcExtension(activeTools: string[] = ["read", "grep"]) {
  const sandbox = {
    async cleanup() {},
    spawn() {
      throw new Error("sandbox spawn should not be used in prompt guidance tests");
    },
    getRuntimeWorkspaceRoot(cwd: string) {
      return cwd;
    },
  };

  class FakeCustomToolManager {
    async start() {}
    close() {}
  }

  class FakeToolRegistry {
    getCallableTools() {
      return [];
    }

    getAutoRoutableToolNames() {
      return ["read", "grep"];
    }
  }

  class FakeCodeExecutor {
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
      return [{ name: "code_execution" }];
    },
    getActiveTools() {
      return [...activeTools];
    },
    setActiveTools(next: string[]) {
      activeTools.splice(0, activeTools.length, ...next);
    },
  };

  await ptcExtension(pi);
  await eventHandlers.get("session_start")?.({}, { cwd: process.cwd() });

  return {
    activeTools,
    registered,
    eventHandlers,
    cleanup() {
      restoreSandbox();
      restoreManager();
      restoreRegistry();
      restoreExecutor();
      delete require.cache[require.resolve("../dist/index.js")];
    },
  };
}

test("code_execution registers prompt metadata for Pi default system prompts", async () => {
  const harness = await bootstrapPtcExtension();
  try {
    const codeExecutionTools = harness.registered.filter((tool) => tool.name === "code_execution");
    assert.ok(codeExecutionTools.length >= 1);
    const latestCodeExecutionTool = codeExecutionTools[codeExecutionTools.length - 1];
    assert.equal(
      latestCodeExecutionTool.promptSnippet,
      "Run Python with local Pi tool calls for repo-wide analysis, batching, aggregation, and compact results."
    );

    assert.deepEqual(latestCodeExecutionTool.promptGuidelines, [
      "Use code_execution for repo-wide analysis, repeated tool calls, or compact aggregation; use direct tools for one-off reads/searches.",
      "Keep intermediate results inside Python and return only compact JSON/text.",
    ]);
    assert.ok(
      latestCodeExecutionTool.promptGuidelines.some((guideline) => /compact JSON\/text/i.test(guideline)),
      "promptGuidelines should stay concise and focused on compact output"
    );
  } finally {
    harness.cleanup();
  }
});

test("auto-routing does not append duplicate prompt text when systemPromptOptions already carries code_execution guidance", async () => {
  const harness = await bootstrapPtcExtension(["read", "grep"]);
  try {
    const routeResult = harness.eventHandlers.get("before_agent_start")?.({
      prompt: "Analyze the first 8 test/**/*.test.ts files and return compact JSON only",
      systemPrompt:
        "base prompt\n\nGuidelines:\n- Use code_execution for repo-wide analysis and keep large intermediate results inside Python.",
      systemPromptOptions: {
        selectedTools: ["code_execution"],
        promptGuidelines: [
          "Use code_execution for repo-wide analysis, repeated lookups, and compact aggregate results.",
        ],
        cwd: process.cwd(),
      },
    });

    assert.deepEqual(harness.activeTools, ["code_execution"]);
    assert.equal(routeResult, undefined);
  } finally {
    harness.cleanup();
  }
});
