import { describe, it, expect } from 'vitest';
import { compileMdx } from '../src/loader.js';

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
    expect(code).toContain('<h1>Heading One</h1>');
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
});
