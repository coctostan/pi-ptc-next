const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { CustomToolManager, loadCustomToolsFromDir } = require("../dist/custom-tool-manager.js");

async function writeTool(toolsDir, filename, source) {
  await fs.writeFile(path.join(toolsDir, filename), `${source}\n`);
}

async function waitFor(condition, timeoutMs = 3000) {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

test("loadCustomToolsFromDir loads ptc metadata from tools directory", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ptc-tools-"));
  const toolsDir = path.join(root, "tools");
  await fs.mkdir(toolsDir, { recursive: true });
  await writeTool(
    toolsDir,
    "echo.js",
    `module.exports = {
      name: 'echo',
      description: 'Echo input',
      parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      ptc: { callable: true, policy: 'read-only', pythonName: 'echo_tool' },
      async execute() { return { content: [{ type: 'text', text: 'ok' }], details: undefined }; }
    };`
  );

  const loaded = await loadCustomToolsFromDir(toolsDir);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].tool.name, "echo");
  assert.deepEqual(loaded[0].tool.ptc, {
    callable: true,
    policy: "read-only",
    pythonName: "echo_tool",
  });
});

test("loadCustomToolsFromDir fails loudly for invalid custom tools", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ptc-invalid-tools-"));
  const toolsDir = path.join(root, "tools");
  await fs.mkdir(toolsDir, { recursive: true });
  await writeTool(toolsDir, "broken.js", "module.exports = { name: 'broken' };");

  await assert.rejects(loadCustomToolsFromDir(toolsDir), /Failed to load 1 custom tool/);
});

test("CustomToolManager startup loads valid tools and warns for invalid ones", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ptc-manager-"));
  const toolsDir = path.join(root, "tools");
  await fs.mkdir(toolsDir, { recursive: true });
  await writeTool(
    toolsDir,
    "echo.js",
    `module.exports = {
      name: 'echo',
      description: 'Echo input',
      parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      async execute() { return { content: [{ type: 'text', text: 'ok' }], details: undefined }; }
    };`
  );
  await writeTool(toolsDir, "broken.js", "module.exports = { name: 'broken' };");

  const registered: string[] = [];
  const activeTools: string[] = [];
  const upserted: string[] = [];
  let changed = 0;
  const warnings: string[] = [];
  const warningHandler = (warning: Error) => {
    warnings.push(warning.message);
  };
  process.on("warning", warningHandler);

  const pi = {
    registerTool(tool: { name: string }) {
      registered.push(tool.name);
    },
    getActiveTools() {
      return [...activeTools];
    },
    setActiveTools(next: string[]) {
      activeTools.splice(0, activeTools.length, ...next);
    },
  };

  const toolRegistry = {
    upsertTool(tool: { name: string }) {
      upserted.push(tool.name);
    },
    removeTool() {
      return true;
    },
  };

  const manager = new CustomToolManager(root, pi, toolRegistry, () => {
    changed += 1;
  });

  try {
    await manager.start();
    await new Promise((resolve) => setImmediate(resolve));
  } finally {
    manager.close();
    process.off("warning", warningHandler);
  }

  assert.deepEqual(registered, ["echo"]);
  assert.deepEqual(upserted, ["echo"]);
  assert.deepEqual(activeTools, ["echo"]);
  assert.equal(changed, 1);
  assert.match(warnings.join("\n"), /Skipping invalid custom tool broken\.js during startup/);
});

test("CustomToolManager reloads, renames, invalidates, and removes tools end-to-end", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ptc-reload-"));
  const toolsDir = path.join(root, "tools");
  await fs.mkdir(toolsDir, { recursive: true });
  await writeTool(
    toolsDir,
    "echo.js",
    `module.exports = {
      name: 'echo',
      description: 'Echo input',
      parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      async execute() { return { content: [{ type: 'text', text: 'ok' }], details: undefined }; }
    };`
  );

  const activeTools: string[] = [];
  const registered: string[] = [];
  const removed: string[] = [];
  const warnings: string[] = [];
  const warningHandler = (warning: Error) => {
    warnings.push(warning.message);
  };
  process.on("warning", warningHandler);

  const pi = {
    registerTool(tool: { name: string }) {
      registered.push(tool.name);
    },
    getActiveTools() {
      return [...activeTools];
    },
    setActiveTools(next: string[]) {
      activeTools.splice(0, activeTools.length, ...next);
    },
  };

  const toolRegistry = {
    upsertTool() {},
    removeTool(name: string) {
      removed.push(name);
      return true;
    },
  };

  let changed = 0;
  const manager = new CustomToolManager(root, pi, toolRegistry, () => {
    changed += 1;
  });

  try {
    await manager.start();
    await waitFor(() => activeTools.includes("echo"));

    await writeTool(
      toolsDir,
      "echo.js",
      `module.exports = {
        name: 'echo_v2',
        description: 'Echo input v2',
        parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
        async execute() { return { content: [{ type: 'text', text: 'ok' }], details: undefined }; }
      };`
    );
    await waitFor(() => activeTools.includes("echo_v2") && !activeTools.includes("echo"));

    await writeTool(toolsDir, "echo.js", "module.exports = { name: 'broken' };\n");
    await waitFor(() => !activeTools.includes("echo_v2"));

    await writeTool(
      toolsDir,
      "echo.js",
      `module.exports = {
        name: 'echo_final',
        description: 'Echo input final',
        parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
        async execute() { return { content: [{ type: 'text', text: 'ok' }], details: undefined }; }
      };`
    );
    await waitFor(() => activeTools.includes("echo_final"));

    await fs.unlink(path.join(toolsDir, "echo.js"));
    await waitFor(() => !activeTools.includes("echo_final"));
  } finally {
    manager.close();
    process.off("warning", warningHandler);
  }

  assert.ok(registered.includes("echo"));
  assert.ok(registered.includes("echo_v2"));
  assert.ok(registered.includes("echo_final"));
  assert.ok(removed.includes("echo"));
  assert.ok(removed.includes("echo_v2"));
  assert.ok(removed.includes("echo_final"));
  assert.ok(changed >= 4);
  assert.match(warnings.join("\n"), /Custom tool reload failed for echo\.js/);
});


test("CustomToolManager reload still converges when fs.watch misses change events", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ptc-reload-missed-watch-"));
  const toolsDir = path.join(root, "tools");
  await fs.mkdir(toolsDir, { recursive: true });
  await writeTool(
    toolsDir,
    "echo.js",
    `module.exports = {
      name: 'echo',
      description: 'Echo input',
      parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
      async execute() { return { content: [{ type: 'text', text: 'ok' }], details: undefined }; }
    };`
  );

  const activeTools: string[] = [];
  const pi = {
    registerTool() {},
    getActiveTools() {
      return [...activeTools];
    },
    setActiveTools(next: string[]) {
      activeTools.splice(0, activeTools.length, ...next);
    },
  };

  const toolRegistry = {
    upsertTool() {},
    removeTool() {
      return true;
    },
  };

  const fsModule = require("node:fs");
  const originalWatch = fsModule.watch;
  fsModule.watch = () => ({ close() {} });

  const manager = new CustomToolManager(root, pi, toolRegistry, () => {});
  try {
    await manager.start();
    await waitFor(() => activeTools.includes("echo"));

    await writeTool(
      toolsDir,
      "echo.js",
      `module.exports = {
        name: 'echo_v2',
        description: 'Echo input v2',
        parameters: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] },
        async execute() { return { content: [{ type: 'text', text: 'ok' }], details: undefined }; }
      };`
    );

    await waitFor(() => activeTools.includes("echo_v2") && !activeTools.includes("echo"));
  } finally {
    manager.close();
    fsModule.watch = originalWatch;
  }
});

