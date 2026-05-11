import test from "node:test";
import assert from "node:assert/strict";
import {
  estimateTokensFromChars,
  loadSettingsFromEnv,
  shouldAutoRoutePromptToCodeExecution,
  truncateOutput,
  validateUserCode,
} from "../dist/utils.js";

test("estimateTokensFromChars uses simple 4-char heuristic", () => {
  assert.equal(estimateTokensFromChars(1), 1);
  assert.equal(estimateTokensFromChars(4), 1);
  assert.equal(estimateTokensFromChars(5), 2);
});

test("truncateOutput respects maxOutputChars while appending truncation notice when possible", () => {
  const result = truncateOutput("x".repeat(200), 80);
  assert.ok(result.length <= 80, `Result should be <= maxOutputChars, got ${result.length}`);
  assert.match(result, /Output truncated/);
});

test("truncateOutput falls back to a hard cut when maxOutputChars is too small for notice", () => {
  const result = truncateOutput("abcdefghij", 5);
  assert.equal(result, "abcde");
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

test("shouldAutoRoutePromptToCodeExecution detects multi-file aggregation prompts", () => {
  assert.equal(
    shouldAutoRoutePromptToCodeExecution(
      "Analyze the first 8 test/**/*.test.ts files and return compact JSON only"
    ),
    true
  );
  assert.equal(
    shouldAutoRoutePromptToCodeExecution(
      "Count imports across src/**/*.ts and show the top 10 packages"
    ),
    true
  );
});

test("shouldAutoRoutePromptToCodeExecution ignores simple or mutating prompts", () => {
  assert.equal(shouldAutoRoutePromptToCodeExecution("Read src/index.ts"), false);
  assert.equal(shouldAutoRoutePromptToCodeExecution("Fix the failing tests in src/index.ts"), false);
});

test("loadSettingsFromEnv clamps automatic recovery attempts to the supported range", () => {
  const previousAutoRecover = process.env.PTC_AUTO_RECOVER;
  const previousMaxAttempts = process.env.PTC_AUTO_RECOVER_MAX_ATTEMPTS;

  try {
    process.env.PTC_AUTO_RECOVER = "true";
    process.env.PTC_AUTO_RECOVER_MAX_ATTEMPTS = "5";
    assert.equal(loadSettingsFromEnv().autoRecover, true);
    assert.equal(loadSettingsFromEnv().autoRecoverMaxAttempts, 1);

    process.env.PTC_AUTO_RECOVER_MAX_ATTEMPTS = "-3";
    assert.equal(loadSettingsFromEnv().autoRecoverMaxAttempts, 0);
  } finally {
    if (previousAutoRecover === undefined) {
      delete process.env.PTC_AUTO_RECOVER;
    } else {
      process.env.PTC_AUTO_RECOVER = previousAutoRecover;
    }

    if (previousMaxAttempts === undefined) {
      delete process.env.PTC_AUTO_RECOVER_MAX_ATTEMPTS;
    } else {
      process.env.PTC_AUTO_RECOVER_MAX_ATTEMPTS = previousMaxAttempts;
    }
  }
});
