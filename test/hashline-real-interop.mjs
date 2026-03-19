import { existsSync, mkdtempSync, writeFileSync, readFileSync, rmSync, statSync, readdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import Module, { createRequire, register } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ptcRoot = path.resolve(__dirname, "..");

function resolveHashlineRoot() {
  const candidates = [
    process.env.PI_HASHLINE_READMAP_ROOT ? path.resolve(process.env.PI_HASHLINE_READMAP_ROOT) : null,
    (() => {
      try {
        return path.dirname(require.resolve("pi-hashline-readmap"));
      } catch {
        return null;
      }
    })(),
    path.resolve(ptcRoot, "../pi-hashline-readmap"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(path.join(candidate, "index.ts")) || existsSync(path.join(candidate, "index.js"))) {
      return candidate;
    }
  }

  throw new Error(
    "Could not locate pi-hashline-readmap. Set PI_HASHLINE_READMAP_ROOT or install the package before running the real interop harness."
  );
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function enumerateFiles(searchPath) {
  const stat = statSync(searchPath);
  if (stat.isFile()) return [searchPath];
  if (!stat.isDirectory()) return [];

  const files = [];
  const stack = [searchPath];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function createHostStub() {
  function createBuiltin(name) {
    return {
      name,
      description: `builtin:${name}`,
      parameters: { type: "object", properties: {} },
      async execute() {
        return { content: [{ type: "text", text: `builtin:${name}` }], details: undefined };
      },
    };
  }

  return {
    DEFAULT_MAX_BYTES: 50_000,
    DEFAULT_MAX_LINES: 2_000,
    formatSize(bytes) {
      return `${bytes} B`;
    },
    truncateHead(content, { maxLines = 2000, maxBytes = 50000 } = {}) {
      const allLines = content.length === 0 ? [] : content.split("\n");
      const totalBytes = Buffer.byteLength(content, "utf8");
      let selectedLines = allLines;
      let truncated = false;

      if (selectedLines.length > maxLines) {
        selectedLines = selectedLines.slice(0, maxLines);
        truncated = true;
      }

      let output = selectedLines.join("\n");
      let outputBytes = Buffer.byteLength(output, "utf8");
      if (outputBytes > maxBytes) {
        output = Buffer.from(output).subarray(0, maxBytes).toString("utf8");
        outputBytes = Buffer.byteLength(output, "utf8");
        selectedLines = output.length === 0 ? [] : output.split("\n");
        truncated = true;
      }

      return {
        content: output,
        truncated,
        outputLines: selectedLines.length,
        outputBytes,
        totalBytes,
      };
    },
    isBashToolResult(event) {
      return event?.toolName === "bash" || event?.name === "bash";
    },
    createReadTool(cwd) {
      return {
        ...createBuiltin("read"),
        async execute(_toolCallId, params) {
          const absolute = path.resolve(cwd, params.path);
          const text = readFileSync(absolute, "utf8");
          return { content: [{ type: "text", text }], details: undefined };
        },
      };
    },
    createGrepTool(cwd) {
      return {
        ...createBuiltin("grep"),
        async execute(_toolCallId, params) {
          const basePath = path.resolve(cwd, params.path || ".");
          const files = enumerateFiles(basePath);
          const flags = params.ignoreCase ? "i" : "";
          const regex = new RegExp(params.literal ? escapeRegex(params.pattern || "") : (params.pattern || ""), flags);
          const context = Number.isInteger(params.context) && params.context > 0 ? params.context : 0;
          const limit = Number.isInteger(params.limit) && params.limit > 0 ? params.limit : Number.MAX_SAFE_INTEGER;

          let emittedMatches = 0;
          const rendered = [];

          for (const filePath of files) {
            const lines = readFileSync(filePath, "utf8").split("\n");
            for (let i = 0; i < lines.length; i++) {
              if (emittedMatches >= limit) break;
              if (!regex.test(lines[i])) continue;

              emittedMatches++;
              const start = Math.max(0, i - context);
              const end = Math.min(lines.length - 1, i + context);
              for (let lineIndex = start; lineIndex <= end; lineIndex++) {
                const marker = lineIndex === i ? ":" : "-";
                rendered.push(`${filePath}${marker}${lineIndex + 1}${marker} ${lines[lineIndex]}`);
              }
            }
            if (emittedMatches >= limit) break;
          }

          const text = rendered.length > 0 ? rendered.join("\n") : "No matches found";
          return { content: [{ type: "text", text }], details: undefined };
        },
      };
    },
    createBashTool() {
      return createBuiltin("bash");
    },
    createEditTool() {
      return createBuiltin("edit");
    },
    createWriteTool() {
      return createBuiltin("write");
    },
    createFindTool() {
      return createBuiltin("find");
    },
    createLsTool() {
      return createBuiltin("ls");
    },
  };
}

const hashlineRoot = resolveHashlineRoot();
const hostStub = createHostStub();
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === "@mariozechner/pi-coding-agent") {
    return hostStub;
  }
  return originalLoad(request, parent, isMain);
};

const loaderDir = mkdtempSync(path.join(tmpdir(), "ptc-hashline-loader-"));
const loaderPath = path.join(loaderDir, "resolve-js-to-ts-loader.mjs");
writeFileSync(
  loaderPath,
  `import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
function tryResolveAsTs(parentURL, specifier) {
  const parentPath = fileURLToPath(parentURL);
  const basePath = path.resolve(path.dirname(parentPath), specifier);
  if (basePath.endsWith(".js")) {
    const candidate = basePath.replace(/\\.js$/, ".ts");
    if (fs.existsSync(candidate)) return candidate;
  }
  if (!path.extname(basePath)) {
    const candidate = \`\${basePath}.ts\`;
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}
export async function resolve(specifier, context, defaultResolve) {
  try {
    return await defaultResolve(specifier, context, defaultResolve);
  } catch (err) {
    if (typeof specifier === "string" && (specifier.startsWith("./") || specifier.startsWith("../")) && context?.parentURL?.startsWith("file:")) {
      const candidate = tryResolveAsTs(context.parentURL, specifier);
      if (candidate) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    throw err;
  }
}
`,
  "utf8"
);
register(pathToFileURL(loaderPath).href, pathToFileURL(`${hashlineRoot}/`));

let sandbox;
let workspaceDir;
try {
  const [{ default: hashlineExtension }, { ToolRegistry }, { CodeExecutor }, { createSandbox }] = await Promise.all([
    import(pathToFileURL(path.join(hashlineRoot, "index.ts")).href),
    import(pathToFileURL(path.join(ptcRoot, "dist/tool-registry.js")).href),
    import(pathToFileURL(path.join(ptcRoot, "dist/code-executor.js")).href),
    import(pathToFileURL(path.join(ptcRoot, "dist/sandbox-manager.js")).href),
  ]);

  const registeredTools = [];
  const activeToolNames = [];
  const pi = {
    registerTool(def) {
      registeredTools.push(def);
      if (!activeToolNames.includes(def.name)) activeToolNames.push(def.name);
    },
    on() {},
    events: {
      on() { return () => {}; },
      emit() {},
    },
    getAllTools() {
      return registeredTools;
    },
    getActiveTools() {
      return activeToolNames;
    },
  };

  hashlineExtension(pi);
  const settings = {
    executionTimeoutMs: 30000,
    maxOutputChars: 40000,
    allowMutations: true,
    allowBash: false,
    maxParallelToolCalls: 4,
    useDocker: false,
    allowUnsandboxedSubprocess: true,
    debugLogging: false,
    callableTools: ["read", "grep", "sg", "edit"],
    blockedTools: undefined,
    trustedReadOnlyTools: undefined,
  };

  sandbox = await createSandbox(settings);
  const registry = new ToolRegistry(pi);
  const executor = new CodeExecutor(sandbox, registry, settings, ptcRoot);

  workspaceDir = mkdtempSync(path.join(tmpdir(), "ptc-hashline-workflow-"));
  const targetFile = path.join(workspaceDir, "demo.ts");
  writeFileSync(
    targetFile,
    [
      "function demoTarget() {",
      '  const value = "before";',
      "  return value;",
      "}",
    ].join("\n"),
    "utf8"
  );

  const code = `search = await sg(pattern="function demoTarget() { $$$BODY }", lang="typescript", path=${JSON.stringify(targetFile)})
target_line = next(line for line in search["files"][0]["lines"] if 'const value = "before";' in line["raw"])
inspection = await read(path=${JSON.stringify(targetFile)}, symbol="demoTarget")
edit_result = await edit(
    path=${JSON.stringify(targetFile)},
    edits=[{"set_line": {"anchor": target_line["anchor"], "new_text": '  const value = "after";'}}],
)
grep_result = await grep(pattern="after", path=${JSON.stringify(targetFile)}, literal=True)
return {
    "search": search,
    "read": inspection,
    "edit": edit_result,
    "grep": grep_result,
}`;

  const result = await executor.execute(code, {
    cwd: workspaceDir,
    ctx: { cwd: workspaceDir },
  });
  const output = JSON.parse(result.output);
  const fileText = readFileSync(targetFile, "utf8");

  console.log(JSON.stringify({ output, details: result.details, fileText }));
} finally {
  Module._load = originalLoad;
  if (sandbox) {
    await sandbox.cleanup();
  }
  if (workspaceDir) {
    rmSync(workspaceDir, { recursive: true, force: true });
  }
  rmSync(loaderDir, { recursive: true, force: true });
}
