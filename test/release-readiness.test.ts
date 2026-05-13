import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXPECTED_PACKAGE_NAME = "pi-ptc-advanced";
const EXPECTED_VERSION = "1.0.0";
const EXPECTED_REPO_SLUG = "coctostan/pi-ptc-advanced";
const STALE_REPO_SLUG = "coctostan/pi-ptc-next";
const EXPECTED_RELEASE_DOC = `docs/releases/${EXPECTED_VERSION}.md`;

function resolveFromRoot(rel: string): string {
  return fileURLToPath(new URL(`../${rel}`, import.meta.url));
}

function read(rel: string): string {
  return readFileSync(resolveFromRoot(rel), "utf-8");
}

function exists(rel: string): boolean {
  return existsSync(resolveFromRoot(rel));
}

function sectionBeforeNextHeading(markdown: string, heading: string): string {
  const start = markdown.indexOf(heading);
  assert.notEqual(start, -1, `${heading} section missing`);
  const rest = markdown.slice(start);
  const nextHeading = rest.slice(heading.length).search(/^##\s/m);
  return nextHeading === -1 ? rest : rest.slice(0, heading.length + nextHeading);
}

test("package.json targets pi-ptc-advanced@1.0.0 and public repo metadata", () => {
  const pkg = JSON.parse(read("package.json")) as {
    name?: string;
    version?: string;
    repository?: { url?: string };
    homepage?: string;
    bugs?: { url?: string };
  };
  assert.equal(pkg.name, EXPECTED_PACKAGE_NAME);
  assert.equal(pkg.version, EXPECTED_VERSION);
  assert.match(pkg.repository?.url ?? "", new RegExp(EXPECTED_REPO_SLUG));
  assert.match(pkg.homepage ?? "", new RegExp(EXPECTED_REPO_SLUG));
  assert.match(pkg.bugs?.url ?? "", new RegExp(EXPECTED_REPO_SLUG));
  assert.doesNotMatch(pkg.repository?.url ?? "", new RegExp(STALE_REPO_SLUG));
  assert.doesNotMatch(pkg.homepage ?? "", new RegExp(STALE_REPO_SLUG));
  assert.doesNotMatch(pkg.bugs?.url ?? "", new RegExp(STALE_REPO_SLUG));
});

test("package-lock.json root metadata is aligned to 1.0.0", () => {
  const lock = JSON.parse(read("package-lock.json")) as {
    name?: string;
    version?: string;
    packages?: Record<string, { name?: string; version?: string }>;
  };
  assert.equal(lock.name, EXPECTED_PACKAGE_NAME);
  assert.equal(lock.version, EXPECTED_VERSION);
  const rootEntry = lock.packages?.[""];
  assert.ok(rootEntry, "lockfile root package entry missing");
  assert.equal(rootEntry?.name, EXPECTED_PACKAGE_NAME);
  assert.equal(rootEntry?.version, EXPECTED_VERSION);
});

test("scripts/verify-release-package.sh asserts the 1.0.0 baseline", () => {
  const script = read("scripts/verify-release-package.sh");
  assert.ok(
    script.includes(`pkg.version !== '${EXPECTED_VERSION}'`),
    "verify-release-package.sh must check version 1.0.0",
  );
  assert.ok(
    script.includes(`expected version ${EXPECTED_VERSION}`),
    "verify-release-package.sh must reference version 1.0.0 in its error text",
  );
  assert.ok(
    !script.includes("0.18.0"),
    "verify-release-package.sh must not reference stale 0.18.0",
  );
  // Preserve existing safety scaffolding.
  assert.ok(script.includes("set -euo pipefail"), "must keep strict shell mode");
  assert.ok(script.includes("pkg.name !== 'pi-ptc-advanced'"), "must keep package name check");
});

test("docs/releases/1.0.0.md exists and describes the public identity baseline", () => {
  assert.ok(exists(EXPECTED_RELEASE_DOC), `${EXPECTED_RELEASE_DOC} must exist`);
  const note = read(EXPECTED_RELEASE_DOC);
  assert.ok(/1\.0\.0/.test(note), "release note must mention 1.0.0");
  assert.ok(/public identity|identity baseline|repo rename/i.test(note), "release note must mention public identity work");
  assert.ok(/manual publish|npm publish/i.test(note), "release note must preserve manual publish boundary");
});

test("README presents the active 1.0.0 public package identity", () => {
  const readme = read("README.md");
  assert.match(readme, /^# pi-ptc-advanced/m, "README must open with pi-ptc-advanced");
  assert.ok(
    readme.includes(`${EXPECTED_PACKAGE_NAME}@${EXPECTED_VERSION}`),
    "README must reference pi-ptc-advanced@1.0.0",
  );
  assert.ok(
    readme.includes(`docs/releases/${EXPECTED_VERSION}.md`),
    "README must link to the 1.0.0 release note",
  );
  assert.ok(
    !readme.includes(`${EXPECTED_PACKAGE_NAME}@0.18.0`),
    "README must not describe pi-ptc-advanced@0.18.0 as the active baseline",
  );
  const installation = sectionBeforeNextHeading(readme, "## Installation");
  assert.doesNotMatch(installation, new RegExp(STALE_REPO_SLUG), "installation must not advertise stale repo identity");
});

test("CHANGELOG promotes the 1.0.0 public identity baseline", () => {
  const changelog = read("CHANGELOG.md");
  assert.ok(
    /^## 1\.0\.0/m.test(changelog),
    "CHANGELOG must contain a 1.0.0 release section",
  );
  const section = changelog.split(/^## 1\.0\.0/m)[1] ?? "";
  assert.ok(/public identity|repo rename|identity baseline/i.test(section), "1.0.0 section must mention identity baseline work");
  assert.ok(/manual publish|not published|publish/i.test(section), "1.0.0 section must not imply automated publish happened");
});

test("docs/personal-fork-maintenance.md targets the 1.0.0 baseline", () => {
  const runbook = read("docs/personal-fork-maintenance.md");
  assert.ok(
    runbook.includes(`${EXPECTED_PACKAGE_NAME}@${EXPECTED_VERSION}`),
    "runbook must reference pi-ptc-advanced@1.0.0",
  );
  assert.ok(
    runbook.includes(`releases/${EXPECTED_VERSION}.md`),
    "runbook must link to the 1.0.0 release note",
  );
  assert.ok(
    !runbook.includes(`${EXPECTED_PACKAGE_NAME}@0.18.0`),
    "runbook must not describe pi-ptc-advanced@0.18.0 as the active baseline",
  );
  const opening = runbook.slice(0, 600);
  assert.doesNotMatch(opening, new RegExp(STALE_REPO_SLUG), "runbook opening must not lead with stale repo identity");
});