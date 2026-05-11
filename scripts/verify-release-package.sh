#!/usr/bin/env bash
set -euo pipefail

echo "[verify:release-package] building release package surface"
npm run build

node <<'NODE'
const pkg = require('./package.json');
const required = ['name', 'version', 'repository', 'homepage', 'bugs', 'license'];
for (const field of required) {
  if (!(field in pkg)) {
    console.error(`[verify:release-package] package.json missing required field: ${field}`);
    process.exit(1);
  }
}
if (pkg.name !== 'pi-ptc-advanced') {
  console.error(`[verify:release-package] expected package name pi-ptc-advanced, found ${pkg.name}`);
  process.exit(1);
}
if (pkg.version !== '0.15.0') {
  console.error(`[verify:release-package] expected version 0.15.0, found ${pkg.version}`);
  process.exit(1);
}
NODE

pack_output="$(npm pack --dry-run 2>&1)"
printf '%s\n' "$pack_output"

required_entries=(
  'README.md'
  'LICENSE'
  'package.json'
  'dist/index.js'
  'src/python-runtime/runtime.py'
  'src/python-runtime/rpc.py'
)

for entry in "${required_entries[@]}"; do
  if ! grep -q "$entry" <<<"$pack_output"; then
    echo "[verify:release-package] expected packaged entry missing: $entry" >&2
    exit 1
  fi
done

for forbidden in '.paul/' 'docs/personal-fork-maintenance.md' 'scripts/verify-release-package.sh' '__pycache__/' '.pyc'; do
  if grep -q "$forbidden" <<<"$pack_output"; then
    echo "[verify:release-package] unexpected packaged entry present: $forbidden" >&2
    exit 1
  fi
done

echo "[verify:release-package] creating installable tarball"
pack_json="$(npm pack --json)"
printf '%s\n' "$pack_json"
pack_filename="$(printf '%s' "$pack_json" | node -e 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync(0, "utf8")); const record=Array.isArray(data)?data[0]:data; if (!record?.filename) process.exit(1); process.stdout.write(record.filename);')"
pack_path="$PWD/$pack_filename"
trap 'rm -f "$pack_path"; rm -rf "$install_dir"' EXIT

install_dir="$(mktemp -d)"
pushd "$install_dir" >/dev/null
npm init -y >/dev/null 2>&1
npm install --ignore-scripts --no-package-lock "$pack_path" >/dev/null 2>&1

node <<'NODE'
const fs = require('fs');
const path = require('path');
const pkg = require(path.join(process.cwd(), 'node_modules/pi-ptc-advanced/package.json'));
if (pkg.name !== 'pi-ptc-advanced') {
  console.error(`[verify:release-package] installed package name mismatch: ${pkg.name}`);
  process.exit(1);
}
if (pkg.version !== '0.15.0') {
  console.error(`[verify:release-package] installed package version mismatch: ${pkg.version}`);
  process.exit(1);
}
for (const rel of ['dist/index.js', 'src/python-runtime/runtime.py', 'src/python-runtime/rpc.py']) {
  const full = path.join(process.cwd(), 'node_modules/pi-ptc-advanced', rel);
  if (!fs.existsSync(full)) {
    console.error(`[verify:release-package] installed tarball missing expected file: ${rel}`);
    process.exit(1);
  }
}
for (const rel of ['src/python-runtime/__pycache__', 'src/python-runtime/runtime.cpython-314.pyc']) {
  const full = path.join(process.cwd(), 'node_modules/pi-ptc-advanced', rel);
  if (fs.existsSync(full)) {
    console.error(`[verify:release-package] installed tarball contains forbidden artifact: ${rel}`);
    process.exit(1);
  }
}
NODE
popd >/dev/null

echo "[verify:release-package] package metadata, tarball surface, and installability look correct"
