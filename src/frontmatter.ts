// Parse satteri's raw frontmatter block into a plain object. satteri returns
// frontmatter as `{ kind, value }` (the raw text) and does NOT parse it, so we
// parse YAML here. See CONTEXT.md milestone 4.

import { parse as parseYaml } from 'yaml';
import type { Frontmatter } from 'satteri';

/** Parse a raw frontmatter block to an object. Returns `{}` when absent. */
export function parseFrontmatter(frontmatter: Frontmatter | null): Record<string, unknown> {
  if (!frontmatter) return {};
  if (frontmatter.kind === 'toml') {
    // TOML parsing isn't bundled; surface raw text rather than guessing.
    console.warn('[satteri-nextjs] TOML frontmatter is not parsed; exporting `{}`.');
    return {};
  }
  const parsed = parseYaml(frontmatter.value) as unknown;
  // YAML scalars/sequences are valid documents; only keep object maps.
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : {};
}
