const test: typeof import("node:test").test = module.require("node:test");
import type {} from "node:test";
const assert: typeof import("node:assert/strict") = module.require("node:assert/strict");

type SessionHandler = (...args: unknown[]) => unknown | Promise<unknown>;

type RegisteredTool = {
  name: string;
  renderResult?: (result: ToolResult, options: RenderOptions, theme: FakeTheme, context?: unknown) => { render(width: number): string[] };
  [key: string]: unknown;
};

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  details?: Record<string, unknown>;
};

type RenderOptions = {
  expanded?: boolean;
  isPartial?: boolean;
};

type FakeTheme = {
  fg(_color: string, text: string): string;
  bold(text: string): string;
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

async function registerCodeExecutionTool() {
  const sandbox = {
    async cleanup() {},
    spawn() {
      throw new Error("sandbox spawn should not be used in render tests");
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
      return [];
    }
  }

  class FakeCodeExecutor {
    async execute() {
      throw new Error("execute should not be called in render tests");
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
      return [];
    },
    setActiveTools() {},
  };

  await ptcExtension(pi);
  await eventHandlers.get("session_start")?.({}, { cwd: process.cwd() });

  const tool = registered.filter((entry) => entry.name === "code_execution").at(-1);
  assert.ok(tool?.renderResult, "code_execution renderResult should be registered");

  return {
    tool,
    cleanup() {
      restoreSandbox();
      restoreManager();
      restoreRegistry();
      restoreExecutor();
      delete require.cache[require.resolve("../dist/index.js")];
    },
  };
}

function fakeTheme(): FakeTheme {
  return {
    fg(_color, text) {
      return text;
    },
    bold(text) {
      return text;
    },
  };
}

function completedResult(): ToolResult {
  return {
    content: [{ type: "text", text: '{"files":2,"status":"ok"}' }],
    details: {
      nestedToolCalls: 2,
      nestedToolNames: ["read", "grep"],
      nestedResultChars: 120,
      nestedResultCount: 2,
      nestedErrors: 0,
      durationMs: 1250,
      estimatedAvoidedTokens: 320,
      userCode: ["entries = await ptc.read_tree(pattern='**/*.ts', path='src')", "return {'files': len(entries)}"],
    },
  };
}

function reportCompletedResult(): ToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify({ kind: "ptc_report", version: 1, title: "Repo summary" }) }],
    details: {
      nestedToolCalls: 1,
      nestedToolNames: ["find"],
      nestedResultChars: 80,
      nestedResultCount: 1,
      nestedErrors: 0,
      durationMs: 2000,
      estimatedAvoidedTokens: 210,
      userCode: ["return ptc.report(title='Repo summary', metrics={'files': 12})"],
      reportProduced: true,
      report: {
        kind: "ptc_report",
        version: 1,
        title: "Repo summary",
        metrics: { files: 12, healthy: true },
        tables: [
          {
            title: "Largest files",
            columns: ["path", "lines"],
            rows: [
              { path: "src/index.ts", lines: 523 },
              { path: "README.md", lines: 854 },
              { path: "test/index.test.ts", lines: 1220 },
            ],
          },
        ],
        samples: [
          { label: "example", value: { path: "src/report.ts", why: "contract" } },
          { label: "secondary", value: ["a", "b", "c"] },
        ],
        warnings: ["README is large", "runtime.py is size-sensitive"],
      },
    },
  };
}

function renderToText(tool: RegisteredTool, result: ToolResult, options: RenderOptions): string {
  const component = tool.renderResult!(result, options, fakeTheme());
  return component.render(120).join("\n");
}

test("completed collapsed code_execution results keep output first and advertise hidden Python source", async () => {
  const harness = await registerCodeExecutionTool();
  try {
    const text = renderToText(harness.tool, completedResult(), { expanded: false, isPartial: false });

    assert.match(text, /nested calls=2/);
    assert.match(text, /\{"files":2,"status":"ok"\}/);
    assert.match(text, /Python source: 2 lines/);
    assert.match(text, /to inspect Python source/);
    assert.doesNotMatch(text, /1\s+│\s+entries = await ptc\.read_tree/);
    assert.doesNotMatch(text, /2\s+│\s+return \{'files': len\(entries\)\}/);
  } finally {
    harness.cleanup();
  }
});

test("completed expanded code_execution results include line-numbered Python source after the result body", async () => {
  const harness = await registerCodeExecutionTool();
  try {
    const text = renderToText(harness.tool, completedResult(), { expanded: true, isPartial: false });

    assert.match(text, /\{"files":2,"status":"ok"\}/);
    assert.match(text, /Python source/);
    assert.match(text, /1\s+│\s+entries = await ptc\.read_tree/);
    assert.match(text, /2\s+│\s+return \{'files': len\(entries\)\}/);
    assert.ok(text.indexOf('{"files":2,"status":"ok"}') < text.indexOf("Python source"));
  } finally {
    harness.cleanup();
  }
});

test("completed collapsed code_execution report results render compact report details without raw JSON noise", async () => {
  const harness = await registerCodeExecutionTool();
  try {
    const text = renderToText(harness.tool, reportCompletedResult(), { expanded: false, isPartial: false });

    assert.match(text, /nested calls=1/);
    assert.match(text, /Repo summary/);
    assert.match(text, /files: 12/);
    assert.match(text, /healthy: true/);
    assert.match(text, /Largest files/);
    assert.match(text, /src\/index\.ts/);
    assert.match(text, /README is large/);
    assert.match(text, /Python source: 1 line/);
    assert.doesNotMatch(text, /"kind"\s*:\s*"ptc_report"/);
    assert.doesNotMatch(text, /test\/index\.test\.ts/);
    assert.doesNotMatch(text, /runtime\.py is size-sensitive/);
  } finally {
    harness.cleanup();
  }
});

test("completed expanded code_execution report results render full rows samples warnings before Python source", async () => {
  const harness = await registerCodeExecutionTool();
  try {
    const text = renderToText(harness.tool, reportCompletedResult(), { expanded: true, isPartial: false });

    assert.match(text, /Repo summary/);
    assert.match(text, /test\/index\.test\.ts/);
    assert.match(text, /runtime\.py is size-sensitive/);
    assert.match(text, /example/);
    assert.match(text, /secondary/);
    assert.match(text, /Python source/);
    assert.ok(text.indexOf("Repo summary") < text.indexOf("Python source"));
  } finally {
    harness.cleanup();
  }
});

test("partial code_execution rendering keeps the current-line executing-code view", async () => {
  const harness = await registerCodeExecutionTool();
  try {
    const text = renderToText(
      harness.tool,
      {
        content: [{ type: "text", text: "running" }],
        details: {
          nestedToolCalls: 0,
          nestedToolNames: [],
          nestedResultChars: 0,
          nestedResultCount: 0,
          nestedErrors: 0,
          durationMs: 0,
          estimatedAvoidedTokens: 0,
          currentLine: 2,
          totalLines: 3,
          userCode: ["a = 1", "b = a + 1", "return b"],
        },
      },
      { expanded: true, isPartial: true }
    );

    assert.match(text, /Executing Python code \(line 2\/3\):/);
    assert.match(text, /→\s+2\s+│ b = a \+ 1/);
    assert.doesNotMatch(text, /Python source:/);
  } finally {
    harness.cleanup();
  }
});
