const test = require("node:test");
import type {} from "node:test";
const assert = require("node:assert/strict");
const { estimateTokensFromChars, loadSettingsFromEnv, truncateOutput, validateUserCode } = require("../dist/utils.js");

test("estimateTokensFromChars uses simple 4-char heuristic", () => {
  assert.equal(estimateTokensFromChars(1), 1);
  assert.equal(estimateTokensFromChars(4), 1);
  assert.equal(estimateTokensFromChars(5), 2);
});

test("truncateOutput appends truncation notice", () => {
  const result = truncateOutput("abcdefghij", 5);
  assert.match(result, /^abcde/);
  assert.match(result, /Output truncated/);
});

test("validateUserCode rejects asyncio.run", () => {
  assert.throws(() => validateUserCode("import asyncio\nasyncio.run(main())"), /Top-level await is already available/);
});

test("validateUserCode rejects direct _rpc_call usage", () => {
  assert.throws(() => validateUserCode("result = await _rpc_call('read', {'path': 'x'})"), /Use the generated helper functions/);
});

function withEnv(overrides: Record<string, string | undefined>, fn: () => void) {
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    fn();
  } finally {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("loadSettingsFromEnv parses and deduplicates policy allow/block lists", () => {
  withEnv(
    {
      PTC_TRUSTED_READ_ONLY_TOOLS: "read_cache, read_cache ,read_cache, audit_log",
      PTC_CALLABLE_TOOLS: "read,grep,read",
      PTC_BLOCKED_TOOLS: "write, write ,edit",
    },
    () => {
      const settings = loadSettingsFromEnv();
      assert.deepEqual(settings.trustedReadOnlyTools, ["read_cache", "audit_log"]);
      assert.deepEqual(settings.callableTools, ["read", "grep"]);
      assert.deepEqual(settings.blockedTools, ["write", "edit"]);
    }
  );
});
