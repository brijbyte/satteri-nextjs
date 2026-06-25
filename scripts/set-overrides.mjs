// Merge pnpm dependency overrides into pnpm-workspace.yaml in place.
//
// Used by CI to pin Next.js (and React) to a specific major before building the
// showcase. Edits the existing document with the `yaml` library so any comments
// and pre-existing `overrides:` entries are preserved — only the named keys are
// set/replaced, never the whole block.
//
// Usage: node scripts/set-overrides.mjs <name>=<spec> [<name>=<spec> ...]
//   node scripts/set-overrides.mjs next=14 react=18 react-dom=18

import { readFileSync, writeFileSync } from 'node:fs';
import { parseDocument } from 'yaml';

const path = process.env.PNPM_WORKSPACE ?? 'pnpm-workspace.yaml';

const entries = process.argv.slice(2).map((arg) => {
  const eq = arg.indexOf('=');
  if (eq <= 0) {
    console.error(`Invalid override "${arg}" — expected <name>=<spec>.`);
    process.exit(1);
  }
  return [arg.slice(0, eq), arg.slice(eq + 1)];
});

if (entries.length === 0) {
  console.error('usage: set-overrides.mjs <name>=<spec> [<name>=<spec> ...]');
  process.exit(1);
}

const doc = parseDocument(readFileSync(path, 'utf8'));

// setIn creates the `overrides` map if absent and replaces matching keys,
// leaving sibling overrides and surrounding comments untouched.
for (const [name, spec] of entries) {
  doc.setIn(['overrides', name], spec);
}

writeFileSync(path, doc.toString());
console.error(`Set overrides in ${path}: ${entries.map(([k, v]) => `${k}@${v}`).join(', ')}`);
