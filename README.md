# satteri-nextjs

Next.js integration for [satteri](https://github.com/bruits/satteri) — Rust-native
Markdown/MDX parsing & compilation, emitted as React/RSC-compatible modules.

The goal: a `@next/mdx`-style plugin that compiles `.md`/`.mdx` with satteri's
`mdxToJs` (parse + compile in Rust) instead of the `@mdx-js/*` toolchain.

> **Status: early scaffold.** See [`CONTEXT.md`](./CONTEXT.md) for the full
> research, the satteri API/plugin-model notes, the Astro-wrapper reference, and
> the milestone plan. Start there when resuming.

## Why

satteri's only existing framework wrapper is Astro-only
(`@astrojs/markdown-satteri`), and satteri uses its **own** plugin model
(`mdastPlugins`/`hastPlugins`), not remark/rehype. There is no Next.js path yet —
this package is that missing piece.

## Planned API

```js
// next.config.mjs
import withSatteri from 'satteri-nextjs';

export default withSatteri({
  features: { gfm: true, frontmatter: true },
  mdastPlugins: [/* satteri mdast plugins */],
  hastPlugins: [/* satteri hast plugins */],
})({
  pageExtensions: ['mdx', 'tsx'],
});
```
