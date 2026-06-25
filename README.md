# satteri-nextjs

A Next.js integration for [satteri](https://github.com/bruits/satteri) — Rust-native
Markdown/MDX parsing and compilation, emitted as React/RSC-compatible modules.

It's a `@next/mdx`-style plugin: drop it into `next.config`, and `.md`/`.mdx`
files compile with satteri's `mdxToJs` (parse + compile in Rust) instead of the
`@mdx-js/*` JavaScript toolchain — while keeping the conventions you expect
(`mdx-components.tsx`, frontmatter, a table of contents, GFM).

- **Fast** — parsing and MDX→JS compilation run in native Rust.
- **RSC-friendly** — output needs no `'use client'`; static subtrees collapse to
  HTML, interactive components stay JSX.
- **Both bundlers** — works under webpack and Turbopack.
- **Tested** against Next.js **14, 15, and 16** on both bundlers.

## Installation

```bash
npm install satteri-nextjs satteri
# or: pnpm add satteri-nextjs satteri
```

`satteri` is a peer dependency (it ships the native binary). Requires
**Next.js ≥ 14** and **React ≥ 18**.

## Quick start

**1. Wrap your Next config:**

```js
// next.config.mjs
import withSatteri from 'satteri-nextjs';

export default withSatteri()({
  // your normal Next.js config
});
```

`withSatteri` automatically adds `md` and `mdx` to `pageExtensions` and wires the
loader into both the webpack and Turbopack pipelines.

**2. Write a page in MDX:**

```mdx
---
title: Hello
description: My first satteri page
---

# Hello world

Some **markdown** with a [link](https://example.com) and GFM ~~strike~~.

<Counter initial={3} />
```

Save it as `app/hello/page.mdx` and visit `/hello`. That's it.

## Component provider (`mdx-components.tsx`)

To make components available to every MDX file without per-page imports, create
an `mdx-components.tsx` in your project root (or `src/`) — the same convention as
`@next/mdx`:

```tsx
// mdx-components.tsx
import { Counter } from './components/Counter';

export function useMDXComponents(components) {
  return { Counter, ...components };
}
```

The file is **optional** — without it, a no-op provider is used and plain MDX
still renders.

> **Note:** static markdown is collapsed to an HTML string for performance
> (`optimizeStatic`), so provider overrides of **base tags** (`h1`, `p`, …) don't
> apply to that collapsed content — only real components (`<Counter />`) stay JSX
> and are resolved from the provider. Pass `optimizeStatic: false` if you need to
> override base tags.

## Frontmatter & table of contents

Every compiled `.md`/`.mdx` module exports `frontmatter` (parsed YAML) and `toc`
(collected headings, each slugged with an `id`) alongside the default component:

```tsx
// app/blog/page.tsx
import Post, { frontmatter, toc } from './post.mdx';

export const metadata = { title: frontmatter.title };

export default function Page() {
  return (
    <>
      <h1>{frontmatter.title}</h1>
      <nav>
        <ul>
          {toc.map((h) => (
            <li key={h.id} style={{ marginLeft: (h.depth - 1) * 12 }}>
              <a href={`#${h.id}`}>{h.value}</a>
            </li>
          ))}
        </ul>
      </nav>
      <Post />
    </>
  );
}
```

To type these named exports on `*.mdx` imports, add an ambient declaration:

```ts
// mdx.d.ts
declare module '*.mdx' {
  import type { ComponentType } from 'react';
  const MDXContent: ComponentType<{ components?: Record<string, unknown> }>;
  export const frontmatter: Record<string, unknown>;
  export const toc: { depth: number; value: string; id: string }[];
  export default MDXContent;
}
```

Both exports are on by default. Disable them with `withSatteri({ toc: false,
frontmatter: false })`. YAML frontmatter is parsed; TOML is not (it exports `{}`
and warns).

## Configuration

`withSatteri(options)` accepts:

| Option                 | Type                                                              | Default                   | Description                                                                                                                            |
| ---------------------- | ----------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `features`             | `{ gfm?, frontmatter?, math?, directive?, smartPunctuation?, … }` | satteri defaults (GFM on) | satteri parser feature toggles.                                                                                                        |
| `mdastPlugins`         | `(plugin \| PluginSpec)[]`                                        | `[]`                      | satteri **mdast** plugins (~ remark).                                                                                                  |
| `hastPlugins`          | `(plugin \| PluginSpec)[]`                                        | `[]`                      | satteri **hast** plugins (~ rehype).                                                                                                   |
| `optimizeStatic`       | `OptimizeStaticConfig \| false`                                   | React-style               | Collapse static subtrees to one HTML string. `false` emits per-node JSX.                                                               |
| `toc`                  | `boolean`                                                         | `true`                    | Slug headings and export `toc`.                                                                                                        |
| `frontmatter`          | `boolean`                                                         | `true`                    | Parse YAML frontmatter and export `frontmatter`.                                                                                       |
| `providerImportSource` | `string`                                                          | managed                   | Where `useMDXComponents` is imported from. Override to use your own provider (e.g. `@mdx-js/react`); then you wire its alias yourself. |
| `jsxImportSource`      | `string`                                                          | `"react"`                 | JSX runtime import source.                                                                                                             |
| `development`          | `boolean`                                                         | from build mode           | Emit `jsxDEV` / source info.                                                                                                           |
| `extension`            | `RegExp`                                                          | `/\.mdx?$/`               | Which files to treat as Markdown/MDX.                                                                                                  |

## Plugins

satteri uses its **own** plugin model (`mdastPlugins` / `hastPlugins`), **not**
remark/rehype — a generic remark/rehype shim isn't viable because satteri's AST
nodes are read-only views over a Rust arena. Write satteri-native plugins (via
`defineMdastPlugin` / `defineHastPlugin` from `satteri`), or use the ready-made
ones shipped here.

### Built-in: `externalLinks`

Adds `target`/`rel` to off-site anchors (~ rehype-external-links):

```js
import withSatteri from 'satteri-nextjs';
import { externalLinks } from 'satteri-nextjs/plugins';

export default withSatteri({
  hastPlugins: [externalLinks({ target: '_blank', rel: 'noopener noreferrer' })],
})({});
```

### Plugins under Turbopack — string specs

Turbopack loader options must be JSON-serializable, so **imported** plugin
functions/objects apply under **webpack only** (Turbopack compiles without them
and a warning is printed). To use a plugin under **both** bundlers, reference it
by a serializable **string spec** instead:

```js
export default withSatteri({
  // 'module#exportName', or ['module#exportName', options]
  hastPlugins: [
    'satteri-nextjs/plugins#externalLinks',
    ['satteri-nextjs/plugins#externalLinks', { target: '_top' }],
  ],
})({});
```

The export is called as `factory(options)` (or used as-is if it isn't a
function) at compile time via dynamic import.

## Using the compiler directly

To compile a string yourself (e.g. user-generated content, a non-route module),
use `compileMdx`:

```ts
import { compileMdx } from 'satteri-nextjs/loader';

const { code, frontmatter, data } = await compileMdx(source, {
  hastPlugins: [
    /* … */
  ],
});
// `code` is an ESM module string; `data.toc` holds collected headings.
```

## Exports

| Specifier                                | Exports                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `satteri-nextjs`                         | `withSatteri` (default), `compileMdx`, `collectHeadings`, `parseFrontmatter`, `externalLinks`, `isPluginSpec`, types |
| `satteri-nextjs/loader`                  | the loader (default) + `compileMdx`, `resolveDevelopment`                                                            |
| `satteri-nextjs/plugins`                 | `externalLinks` (and future built-in plugins)                                                                        |
| `satteri-nextjs/mdx-components-fallback` | the no-op provider used when no `mdx-components` file exists                                                         |

## Compatibility notes

- **Next.js version:** the Turbopack config key moved from `experimental.turbo`
  (13.0–15.2) to top-level `turbopack` (15.3+); `withSatteri` detects the
  installed version and writes to the correct key automatically.
- **`serverExternalPackages`:** to keep the native binary out of your bundle, add
  `satteri` (and `satteri-nextjs`) to `serverExternalPackages` (Next ≥ 15) or
  `experimental.serverComponentsExternalPackages` (Next 14).
- **Custom provider:** if you pass your own `providerImportSource`, `withSatteri`
  stops managing the `mdx-components` alias — wire it up yourself.

## License

MIT

---

> Building on or contributing to this package? See [`CONTEXT.md`](./CONTEXT.md)
> for the design rationale, satteri API/plugin-model notes, the Astro-wrapper
> reference, and the milestone history.
