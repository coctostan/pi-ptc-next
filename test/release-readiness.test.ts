import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXPECTED_PACKAGE_NAME = "pi-ptc-advanced";
const EXPECTED_VERSION = "1.0.0";
const EXPECTED_REPO_SLUG = "coctostan/pi-ptc-advanced";
const STALE_REPO_SLUG = "coctostan/pi-ptc-next";
const EXPECTED_RELEASE_DOC = `docs/releases/${EXPECTED_VERSION}.md`;
const PUBLISH_CHECKLIST_DOC = "docs/releases/PUBLISH-CHECKLIST.md";
const REPO_RENAME_CHECKLIST_DOC = "docs/releases/REPO-RENAME-CHECKLIST.md";

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

const REQUIRED_README_SECTIONS = [
  /^## Quick Start/m,
  /^## Installation/m,
  /^## Usage/m,
  /^## Python helpers/m,
  /^## (Configuration|Environment variables)/m,
  /^## Verification/m,
  /^## Limitations/m,
  /^## Development/m,
  /^## Troubleshooting/m,
  /^## License/m,
  /^## Credits/m,
];

test("README has the Phase 59 public package section structure", () => {
  const readme = read("README.md");
  for (const re of REQUIRED_README_SECTIONS) {
    assert.match(readme, re, `README missing required section: ${re}`);
  }
});

test("README opening path leads with product value, not deep internals or lineage", () => {
  const readme = read("README.md");
  const quickStart = readme.search(/^## Quick Start/m);
  const installation = readme.search(/^## Installation/m);
  const credits = readme.search(/^## Credits/m);
  const architecture = readme.search(/^## Architecture/m);
  const howItWorks = readme.search(/^## How it works/m);
  assert.ok(quickStart > 0, "README must include a Quick Start section");
  assert.ok(installation > 0, "README must include an Installation section");
  assert.ok(credits > 0, "README must include a Credits section");
  assert.ok(
    quickStart < credits,
    "Quick Start must appear before Credits/lineage in the README opening path",
  );
  if (architecture > 0) {
    assert.ok(
      quickStart < architecture,
      "Quick Start must appear before deep Architecture details",
    );
  }
  if (howItWorks > 0) {
    assert.ok(
      quickStart < howItWorks,
      "Quick Start must appear before deep How it works section",
    );
  }
  assert.ok(
    installation < credits,
    "Installation must appear before Credits/lineage",
  );
});

test("README does not advertise npm/pi registry install commands before publish is confirmed", () => {
  const readme = read("README.md");
  assert.doesNotMatch(
    readme,
    /\bnpm install\s+pi-ptc-advanced\b/,
    "README must not advertise `npm install pi-ptc-advanced` until publish is confirmed",
  );
  assert.doesNotMatch(
    readme,
    /\bpi install\s+pi-ptc-advanced(?!-)/,
    "README must not advertise `pi install pi-ptc-advanced` until publish is confirmed",
  );
  assert.doesNotMatch(
    readme,
    /available on npm/i,
    "README must not claim the package is available on npm",
  );
});

test("README does not use 'personal fork' as primary public release framing", () => {
  const readme = read("README.md");
  assert.doesNotMatch(
    readme,
    /^## Personal fork/m,
    "README must not use 'Personal fork' as an active section heading",
  );
  // File path/link references to docs/personal-fork-maintenance.md and
  // scripts/verify-personal-fork.sh are allowed; lead-paragraph framing is not.
  const openingPath = readme.slice(0, 1500);
  assert.doesNotMatch(
    openingPath,
    /\bpersonal fork\b/i,
    "README opening must not lead with 'personal fork' framing",
  );
});

test("README/runbook/release note do not claim publish, tags, or GitHub releases happened", () => {
  const claims = [
    /has been published to npm/i,
    /now available on the npm registry/i,
    /git tag .* (?:has been )?(?:created|pushed)/i,
    /GitHub release (?:has been )?published/i
  ];
  for (const rel of ["README.md", "docs/personal-fork-maintenance.md", EXPECTED_RELEASE_DOC]) {
    const body = read(rel);
    for (const claim of claims) {
      assert.doesNotMatch(body, claim, `${rel} must not claim ${claim} occurred`);
    }
  }
});

test("runbook leads with public release maintenance, not personal-fork framing", () => {
  const runbook = read("docs/personal-fork-maintenance.md");
  const firstLine = runbook.split("\n", 1)[0] ?? "";
  assert.match(
    firstLine,
    /Public Release Maintenance/i,
    "runbook title must be Public Release Maintenance, not personal-fork-first framing",
  );
  const opening = runbook.slice(0, 600);
  assert.doesNotMatch(
    opening,
    /^# Personal fork/m,
    "runbook must not use 'Personal fork' as its top heading",
  );
});

test("docs/releases/1.0.0.md describes the user-facing baseline and verification path", () => {
  const note = read(EXPECTED_RELEASE_DOC);
  assert.match(note, /verify:release-package|verify-release-package/i, "release note must reference the release-package verifier");
  assert.match(note, /verify:ci|verify-ci|workflows\/ci\.yml/i, "release note must reference the CI parity verification path");
  assert.match(note, /repo rename|repository rename/i, "release note must reference the manual repo-rename boundary");
});
test("Phase 60 release gate: PUBLISH-CHECKLIST drift guards", () => {
  assert.ok(
    existsSync(resolveFromRoot(PUBLISH_CHECKLIST_DOC)),
    `${PUBLISH_CHECKLIST_DOC} must exist as the repo-owned publish checklist`,
  );
  const checklist = read(PUBLISH_CHECKLIST_DOC);

  for (const heading of [
    "Preconditions",
    "Dry-run",
    "Manual publish",
    "Post-publish manual steps",
    "Stop here for automated APPLY",
  ]) {
    const pattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "im");
    assert.match(checklist, pattern, `PUBLISH-CHECKLIST.md must include heading "## ${heading}"`);
  }

  assert.match(checklist, /npm pack --dry-run/, "checklist must reference `npm pack --dry-run`");
  assert.match(checklist, /npm publish --dry-run/, "checklist must reference `npm publish --dry-run`");
  assert.ok(
    checklist.includes(`${EXPECTED_PACKAGE_NAME}@${EXPECTED_VERSION}`),
    `checklist must reference ${EXPECTED_PACKAGE_NAME}@${EXPECTED_VERSION} literally`,
  );

  for (const phrase of [
    "has been published",
    "is published on npm",
    "tag created",
    "release created",
    "repo renamed",
  ]) {
    assert.ok(
      !new RegExp(phrase, "i").test(checklist),
      `checklist must NOT claim "${phrase}" — publish/tag/release/rename remain manual/user-owned`,
    );
  }
});

test("Phase 60 release gate: 1.0.0 release note links to PUBLISH-CHECKLIST", () => {
  const note = read(EXPECTED_RELEASE_DOC);
  const boundariesIdx = note.search(/^##\s+Manual boundaries\b/im);
  assert.ok(boundariesIdx >= 0, "1.0.0 release note must have a `## Manual boundaries` section");
  const boundariesSection = note.slice(boundariesIdx);
  assert.match(
    boundariesSection,
    /\(\.\/PUBLISH-CHECKLIST\.md\)|PUBLISH-CHECKLIST\.md/,
    "Manual boundaries section must link to PUBLISH-CHECKLIST.md",
  );
});

test("Phase 60 release gate: CHANGELOG 1.0.0 entry mentions PUBLISH-CHECKLIST", () => {
  const changelog = read("CHANGELOG.md");
  const v100Idx = changelog.search(/^##\s+1\.0\.0\b/m);
  assert.ok(v100Idx >= 0, "CHANGELOG.md must have a `## 1.0.0` heading");
  const after = changelog.slice(v100Idx + 1);
  const nextHeadingIdx = after.search(/^##\s+/m);
  const entry = nextHeadingIdx >= 0 ? after.slice(0, nextHeadingIdx) : after;
  assert.match(
    entry,
    /PUBLISH-CHECKLIST\.md|publish checklist/i,
    "CHANGELOG.md 1.0.0 entry must reference the publish checklist",
  );
});


test("Phase 61 repo rename gate: REPO-RENAME-CHECKLIST drift guards", () => {
  assert.ok(
    existsSync(resolveFromRoot(REPO_RENAME_CHECKLIST_DOC)),
    `${REPO_RENAME_CHECKLIST_DOC} must exist as the repo-owned rename checklist`,
  );
  const checklist = read(REPO_RENAME_CHECKLIST_DOC);

  for (const heading of [
    "Preconditions",
    "Human action: GitHub repository rename",
    "Redirect and remote migration proof",
    "Post-rename verification",
    "Deferral or rollback",
    "Stop here for automated APPLY",
  ]) {
    const pattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "im");
    assert.match(checklist, pattern, `REPO-RENAME-CHECKLIST.md must include heading "## ${heading}"`);
  }

  assert.ok(checklist.includes(STALE_REPO_SLUG), `checklist must mention ${STALE_REPO_SLUG}`);
  assert.ok(checklist.includes(EXPECTED_REPO_SLUG), `checklist must mention ${EXPECTED_REPO_SLUG}`);
  assert.match(checklist, /gh repo view coctostan\/pi-ptc-advanced/, "checklist must include GitHub visibility verification");
  assert.match(checklist, /git remote -v/, "checklist must include local remote verification");
  assert.match(checklist, /redirect/i, "checklist must include old-name redirect verification");
  assert.match(checklist, /npm run verify:ci|CI/i, "checklist must include CI verification guidance");
  assert.match(checklist, /package metadata|package\.json/i, "checklist must include package metadata verification guidance");

  for (const phrase of [
    "repository rename complete",
    "repo rename complete",
    "has been renamed",
    "old repository removed",
  ]) {
    assert.ok(
      !new RegExp(phrase, "i").test(checklist),
      `checklist must NOT claim "${phrase}" — repository rename remains manual/user-owned until confirmed`,
    );
  }
});

test("Phase 61 repo rename gate: active docs link to REPO-RENAME-CHECKLIST", () => {
  for (const doc of [
    "README.md",
    "docs/personal-fork-maintenance.md",
    EXPECTED_RELEASE_DOC,
    PUBLISH_CHECKLIST_DOC,
  ]) {
    assert.match(
      read(doc),
      /REPO-RENAME-CHECKLIST\.md/,
      `${doc} must link to or name REPO-RENAME-CHECKLIST.md`,
    );
  }
});
