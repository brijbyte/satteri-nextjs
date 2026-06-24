import { describe, it, expect } from 'vitest';
import { compileMdx } from '../src/loader.js';
import { externalLinks } from '../src/plugins.js';

const DOC = `[external](https://example.com) and [internal](/docs/foo) and [proto](//cdn.dev/x).`;

describe('externalLinks plugin (milestone 5)', () => {
  it('adds target/rel to external anchors only', async () => {
    const { code } = await compileMdx(DOC, { hastPlugins: [externalLinks()] });
    // Static HTML is JSON-escaped inside dangerouslySetInnerHTML.
    expect(code).toContain('href=\\"https://example.com\\" target=\\"_blank\\" rel=\\"noopener noreferrer\\"');
    expect(code).toContain('href=\\"//cdn.dev/x\\" target=\\"_blank\\"');
    // Internal link is untouched.
    expect(code).toContain('href=\\"/docs/foo\\">internal</a>');
    expect(code).not.toContain('href=\\"/docs/foo\\" target');
  });

  it('honors custom target/rel and test predicate', async () => {
    const { code } = await compileMdx(DOC, {
      hastPlugins: [externalLinks({ target: '_top', rel: 'external', test: (h) => h.startsWith('/docs') })],
    });
    // Now only the /docs link matches.
    expect(code).toContain('href=\\"/docs/foo\\" target=\\"_top\\" rel=\\"external\\"');
    expect(code).toContain('href=\\"https://example.com\\">external</a>');
  });
});
