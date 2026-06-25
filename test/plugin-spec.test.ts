import { describe, it, expect } from 'vitest';
import { compileMdx } from '../src/loader.js';
import { isPluginSpec } from '../src/plugin-spec.js';

const DOC = `[ext](https://example.com) and [int](/local).`;
const html = (code: string) =>
  (code.match(/__html: "([\s\S]*?)" \}/)?.[1] ?? '').replace(/\\"/g, '"');

describe('isPluginSpec', () => {
  it('recognizes string and [string, options] forms only', () => {
    expect(isPluginSpec('pkg/mod#plugin')).toBe(true);
    expect(isPluginSpec(['pkg/mod#plugin', { a: 1 }])).toBe(true);
    expect(isPluginSpec(() => ({ name: 'x' }))).toBe(false); // factory
    expect(isPluginSpec({ name: 'x', element: {} })).toBe(false); // definition
    expect(isPluginSpec([])).toBe(false);
    expect(isPluginSpec([{ name: 'x' }])).toBe(false); // array but not string-led
  });
});

describe('plugin specs through compileMdx', () => {
  it('applies a plugin referenced by a string spec', async () => {
    const { code } = await compileMdx(DOC, {
      hastPlugins: ['satteri-nextjs/plugins#externalLinks'],
    });
    expect(html(code)).toContain(
      'href="https://example.com" target="_blank" rel="noopener noreferrer"'
    );
    expect(html(code)).toContain('href="/local">int</a>');
  });

  it('passes options via the [spec, options] tuple form', async () => {
    const { code } = await compileMdx(DOC, {
      hastPlugins: [['satteri-nextjs/plugins#externalLinks', { target: '_top', rel: 'x' }]],
    });
    expect(html(code)).toContain('href="https://example.com" target="_top" rel="x"');
  });

  it('throws a clear error when the named export is missing', async () => {
    await expect(compileMdx(DOC, { hastPlugins: ['satteri-nextjs/plugins#nope'] })).rejects.toThrow(
      /no export "nope"/
    );
  });

  it('supports a mixed array of bare-string and [spec, opts] entries', async () => {
    // First entry is a bare string spec; second is a [spec, opts] tuple that
    // runs after it and overrides `rel`. Both forms coexist in one array.
    const { code } = await compileMdx(DOC, {
      hastPlugins: [
        'satteri-nextjs/plugins#externalLinks',
        ['satteri-nextjs/plugins#externalLinks', { rel: 'second-wins' }],
      ],
    });
    expect(html(code)).toContain('href="https://example.com" target="_blank" rel="second-wins"');
  });
});
