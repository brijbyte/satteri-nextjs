import { describe, it, expect } from 'vitest';
import satteriLoader, { compileMdx, resolveDevelopment } from '../src/loader.js';

const SRC = `---
title: Hello
---

# Heading One

Some **bold** text and a [link](https://example.com).

<Counter initial={3} />
`;

describe('compileMdx (loader core)', () => {
  it('emits a React ESM module with a default export', async () => {
    const { code } = await compileMdx(SRC);
    expect(code).toContain('react/jsx-runtime');
    expect(code).toContain('export default MDXContent');
  });

  it('collapses static subtrees via React-style optimizeStatic', async () => {
    const { code } = await compileMdx(SRC);
    // Static markdown becomes one dangerouslySetInnerHTML div, not per-node jsx.
    expect(code).toContain('dangerouslySetInnerHTML');
    // Headings are slugged by the built-in TOC plugin (milestone 4).
    expect(code).toContain('<h1 id=\\"heading-one\\">Heading One</h1>');
  });

  it('leaves JSX components to be resolved from props.components', async () => {
    const { code } = await compileMdx(SRC);
    expect(code).toContain('Counter');
  });

  it('can disable static collapsing with optimizeStatic: false', async () => {
    const { code } = await compileMdx(SRC, { optimizeStatic: false });
    expect(code).not.toContain('dangerouslySetInnerHTML');
  });

  it('surfaces raw frontmatter', async () => {
    const { frontmatter } = await compileMdx(SRC);
    expect(frontmatter?.kind).toBe('yaml');
    expect(frontmatter?.value).toContain('title: Hello');
  });

  it('returns code synchronously-resolvable when no async plugins are used', async () => {
    const { code } = await compileMdx('# Just markdown');
    expect(code).toContain('export default MDXContent');
  });

  describe('resolveDevelopment (dev-mode detection)', () => {
    it('prefers an explicit option over everything', () => {
      expect(resolveDevelopment(true, 'production', 'production')).toBe(true);
      expect(resolveDevelopment(false, 'development', 'development')).toBe(false);
    });

    it('uses webpack this.mode when present', () => {
      expect(resolveDevelopment(undefined, 'development', 'production')).toBe(true);
      expect(resolveDevelopment(undefined, 'production', 'development')).toBe(false);
    });

    it('falls back to NODE_ENV when mode is absent (Turbopack/bare loader)', () => {
      expect(resolveDevelopment(undefined, undefined, 'development')).toBe(true);
      expect(resolveDevelopment(undefined, undefined, 'production')).toBe(false);
      expect(resolveDevelopment(undefined, undefined, 'test')).toBe(false);
    });

    it('treats an unset NODE_ENV as development', () => {
      expect(resolveDevelopment(undefined, undefined, undefined)).toBe(true);
    });
  });

  describe('GFM features (milestone 2)', () => {
    const GFM = `~~struck~~

| a | b |
|---|---|
| 1 | 2 |
`;

    it('renders GFM (strikethrough + table) by default', async () => {
      const { code } = await compileMdx(GFM);
      expect(code).toContain('<del>');
      expect(code).toContain('<table>');
    });

    it('can disable GFM via features.gfm: false', async () => {
      const { code } = await compileMdx(GFM, { features: { gfm: false } });
      expect(code).not.toContain('<del>');
      expect(code).not.toContain('<table>');
    });
  });

  describe('heading slugs (milestone 4)', () => {
    it('slugs heading text including inline markup', async () => {
      const { code, data } = await compileMdx('## Hello **bold** world');
      expect(data.toc).toEqual([{ depth: 2, value: 'Hello bold world', id: 'hello-bold-world' }]);
      expect(code).toContain('id=\\"hello-bold-world\\"');
    });
  });

  describe('webpack loader entry', () => {
    it('compiles source and calls back with the emitted code', async () => {
      const code: string = await new Promise((resolve, reject) => {
        const ctx = {
          async: () => (err: Error | null, content?: string) =>
            err ? reject(err) : resolve(content!),
          getOptions: () => ({}),
          resourcePath: '/app/page.mdx',
          mode: 'production' as const,
        };
        satteriLoader.call(ctx, '# Loaded');
      });
      expect(code).toContain('export default MDXContent');
      expect(code).toContain('id=\\"loaded\\"');
    });

    it('reports a compile error through the async callback', async () => {
      const err: Error = await new Promise((resolve) => {
        const ctx = {
          async: () => (e: Error | null) => resolve(e as Error),
          getOptions: () => ({ hastPlugins: ['satteri-nextjs/plugins#nope'] }),
        };
        satteriLoader.call(ctx, '# x');
      });
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toMatch(/no export "nope"/);
    });
  });

  describe('milestone 4: frontmatter + toc exports', () => {
    const DOC = `---
title: Hello
tags: [a, b]
---

# Big Title

## Section One

## Section One
`;

    it('exports parsed YAML frontmatter as an object', async () => {
      const { code } = await compileMdx(DOC);
      expect(code).toContain('export const frontmatter = {"title":"Hello","tags":["a","b"]};');
    });

    it('exports a toc with depth, value and slugged ids (deduped)', async () => {
      const { code, data } = await compileMdx(DOC);
      expect(data.toc).toEqual([
        { depth: 1, value: 'Big Title', id: 'big-title' },
        { depth: 2, value: 'Section One', id: 'section-one' },
        { depth: 2, value: 'Section One', id: 'section-one-1' },
      ]);
      expect(code).toContain('export const toc = [');
    });

    it('exports an empty frontmatter object when none present', async () => {
      const { code } = await compileMdx('# No frontmatter');
      expect(code).toContain('export const frontmatter = {};');
    });

    it('can disable both exports', async () => {
      const { code } = await compileMdx(DOC, { toc: false, frontmatter: false });
      expect(code).not.toContain('export const frontmatter');
      expect(code).not.toContain('export const toc');
      // With toc off, headings are not slugged.
      expect(code).toContain('<h1>Big Title</h1>');
    });
  });
});
