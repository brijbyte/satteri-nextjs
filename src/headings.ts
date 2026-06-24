// Built-in hast plugin: slug headings (set `id`) and collect a table of
// contents into `ctx.data.toc`. satteri has no built-in TOC, so milestone 4
// supplies one. See CONTEXT.md milestone 4.

import { defineHastPlugin } from 'satteri';
import type { HastPluginDefinition } from 'satteri';

const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/** A single collected heading. Re-exported from the module as `toc`. */
export interface TocEntry {
  /** Heading level, 1–6. */
  depth: number;
  /** Plain-text content of the heading. */
  value: string;
  /** Slug used as the heading's `id` (anchor target). */
  id: string;
}

/** GitHub-style slugger with per-document uniqueness (`foo`, `foo-1`, ...). */
function createSlugger() {
  const seen = new Map<string, number>();
  return (text: string): string => {
    const base = text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9 \-_]/g, '')
      .replace(/\s+/g, '-');
    const count = seen.get(base);
    if (count === undefined) {
      seen.set(base, 0);
      return base;
    }
    const next = count + 1;
    seen.set(base, next);
    return `${base}-${next}`;
  };
}

/**
 * Factory (one closure per compile, so the slugger resets per document):
 * assigns a stable `id` to each heading and pushes a `TocEntry` onto
 * `ctx.data.toc`. Respects an existing `id` (e.g. from `headingAttributes`).
 */
export function collectHeadings(): HastPluginDefinition {
  const slug = createSlugger();
  return defineHastPlugin({
    name: 'satteri-nextjs:collect-headings',
    element: {
      filter: HEADING_TAGS,
      visit(node, ctx) {
        const depth = Number(node.tagName[1]);
        const value = ctx.textContent(node);
        let id = node.properties?.id as string | undefined;
        if (!id) {
          id = slug(value);
          ctx.setProperty(node, 'id', id);
        }
        const toc = (ctx.data.toc as TocEntry[] | undefined) ?? [];
        toc.push({ depth, value, id });
        ctx.data.toc = toc;
      },
    },
  });
}
