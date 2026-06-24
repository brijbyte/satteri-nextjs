// Extract the changelog section for a single version from CHANGELOG.md.
// Parsing only — the changelog itself is authored by hand. Used by the publish
// workflow to build the GitHub release body.
//
// Streams the file line by line and STOPS as soon as the section is closed: it
// reads only up to the version's `##` heading and the next `##` boundary, never
// the whole file. Heading detection is a line-level regex (ATX `##` headings,
// as Keep a Changelog uses), with fenced-code-block awareness so a `## ` inside
// a code block isn't mistaken for a heading. The body is sliced verbatim, so
// formatting — including nested `###` — is preserved.
//
// Usage: node scripts/extract-changelog.mjs <version> [changelogPath]

import { createReadStream, existsSync } from 'node:fs';
import { createInterface } from 'node:readline';

const version = process.argv[2];
const path = process.argv[3] ?? 'CHANGELOG.md';

if (!version) {
  console.error('usage: extract-changelog.mjs <version> [changelogPath]');
  process.exit(1);
}

if (!existsSync(path)) {
  console.error(`Changelog file "${path}" not found — add it before releasing.`);
  process.exit(4);
}

// Match a heading naming this exact version (e.g. `[1.2.3] - …` or `v1.2.3`),
// guarding against 1.2.3 matching 1.2.30.
const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const versionRe = new RegExp(`(^|[\\s[v])${escaped}([\\s\\]]|$)`);

const fenceRe = /^(```|~~~)/;
const atxRe = /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/; // captures depth + heading text

const rl = createInterface({
  input: createReadStream(path, 'utf8'),
  crlfDelay: Infinity,
});

const collected = [];
let inFence = false;
let capturing = false;
let found = false;

for await (const line of rl) {
  // Track fenced code blocks so a `## ` inside a fence isn't seen as a heading.
  if (fenceRe.test(line.trim())) {
    inFence = !inFence;
    if (capturing) collected.push(line);
    continue;
  }

  const heading = inFence ? null : atxRe.exec(line);
  if (heading) {
    const depth = heading[1].length;
    if (depth <= 2) {
      if (capturing) break; // next section boundary → stop reading the file
      if (depth === 2 && versionRe.test(heading[2])) {
        capturing = true; // start after this heading; don't include it
        found = true;
      }
      continue;
    }
    // depth ≥ 3 heading: falls through and is kept as section body below.
  }

  if (capturing) collected.push(line);
}
rl.close();

if (!found) {
  console.error(`No changelog section found for version "${version}" in ${path}`);
  process.exit(2);
}

const body = collected.join('\n').trim();
if (!body) {
  console.error(`Changelog section for "${version}" is empty.`);
  process.exit(3);
}

process.stdout.write(body + '\n');
