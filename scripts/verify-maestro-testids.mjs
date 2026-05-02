#!/usr/bin/env node
/**
 * Ensures `.maestro/smoke_login_booking.yaml` references testIDs/prefixes that exist in source.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const yamlPath = path.join(root, '.maestro', 'smoke_login_booking.yaml');

function collectSourceFiles(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (
        ent.name === 'node_modules' ||
        ent.name === 'dist' ||
        ent.name === 'dist-unit' ||
        ent.name === '.git'
      )
        continue;
      collectSourceFiles(p, acc);
    } else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) {
      acc.push(p);
    }
  }
  return acc;
}

function readAllSources() {
  const appDir = path.join(root, 'app');
  const srcDir = path.join(root, 'src');
  const files = [...collectSourceFiles(appDir), ...collectSourceFiles(srcDir)];
  return files.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
}

function main() {
  if (!fs.existsSync(yamlPath)) {
    console.error('Maestro smoke file missing:', yamlPath);
    process.exit(1);
  }

  const yaml = fs.readFileSync(yamlPath, 'utf8');
  const idLines = [...yaml.matchAll(/^[\s\-]*id:\s*(.+)$/gm)].map((m) => m[1].trim());
  const regexLines = [...yaml.matchAll(/^[\s\-]*idRegex:\s*"(.+)"$/gm)].map((m) => m[1].trim());

  const sources = readAllSources();
  const missing = [];

  for (const rawId of [...new Set(idLines)]) {
    const needleJsx = `testID="${rawId}"`;
    const needleExpr = `testID={\`${rawId}`;
    const needleExprSq = `testID={'${rawId}'}`;
    if (!sources.includes(needleJsx) && !sources.includes(needleExpr) && !sources.includes(needleExprSq))
      missing.push(`id: ${rawId}`);
  }

  for (const pattern of [...new Set(regexLines)]) {
    const prefixMatch = /^(\^\/)?([^$*+.?()[\]\\]+)/.exec(pattern);
    const prefix =
      prefixMatch?.[2] ??
      pattern
        .replace(/^\^\//, '')
        .replace(/\.\*$/, '')
        .replace(/\\\./g, '.');
    if (!prefix.trim()) continue;
    if (!sources.includes(prefix))
      missing.push(`idRegex pattern not found in sources: "${pattern}" (expected substring "${prefix}")`);
  }

  if (missing.length) {
    console.error('Maestro vs source testID mismatch:\n', missing.join('\n'));
    process.exit(1);
  }

  console.log(`verify-maestro-testids OK (${idLines.length} ids, ${regexLines.length} regex rows).`);
}

main();
