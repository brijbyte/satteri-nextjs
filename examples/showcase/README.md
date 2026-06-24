# satteri-nextjs showcase

A Next.js (App Router) app that demonstrates each milestone of the
[`satteri-nextjs`](../../README.md) integration — Rust-native Markdown/MDX
compiled to React/RSC modules via [satteri](https://github.com/bruits/satteri).

## Running it

This app consumes the library from the pnpm workspace (`workspace:*`), so build
the library first:

```bash
pnpm install            # from the repo root
pnpm build              # builds the library's dist/ (tsc -b)
pnpm --filter satteri-nextjs-showcase dev
```

Then open http://localhost:3000. `next.config.mjs` wraps the config with
`withSatteri(...)`, so `.md`/`.mdx` files render as real pages.

> Rebuilt the library mid-session? Restart `next dev` (and clear `.next` if a
> stale "export doesn't exist" error persists) — see the root `CONTEXT.md`
> "Dev gotchas" notes.

## What each route shows

| Route | Milestone | Demonstrates |
| --- | --- | --- |
| `/` | — | Index, driven by `app/milestones.ts`. |
| `/milestone-1` | 1 — Loader core | `compileMdx()` source → `{ code, frontmatter, data }` → live render via `evaluate`. |
| `/milestone-2` | 2 — `withSatteri` | A real `app/milestone-2/page.mdx` rendered through the loader (no `evaluate` shim); GFM + frontmatter strip. |
| `/milestone-3` | 3 — Provider | `<Counter>` / `<Note>` resolved from root `mdx-components.tsx` with no per-page wiring. |
| `/milestone-4` | 4 — TOC / frontmatter | `import Content, { frontmatter, toc }` from a `.mdx` module; renders a TOC + frontmatter `<dl>` and Next `metadata`. |
| `/milestone-5` | 5 — Plugins | `externalLinks` satteri plugin applied via `compileMdx`; "why no remark/rehype shim" writeup. |
| `/external-links` | 5 — Plugins | A real `.mdx` route wiring `externalLinks` through `next.config` as a string plugin spec (works under Turbopack). |

## Layout

- `app/milestones.ts` — single source of truth for the index list (title, route,
  and the library/example files implementing each milestone).
- `mdx-components.tsx` — the provider convention (milestone 3): maps `Counter`
  and a custom `Note`.
- `mdx.d.ts` — types the named exports (`frontmatter`, `toc`) on `.mdx` modules.
- `next.config.mjs` — `withSatteri(...)`; sets
  `serverExternalPackages: ['satteri', 'satteri-nextjs']` so the native binary
  isn't bundled.
