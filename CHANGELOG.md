# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Release process:** bump `version` in `package.json` and add a section here,
> then push to `main`. The publish workflow tags `v<version>`, publishes to npm
> (with provenance), and creates a GitHub release from this file's matching
> section. Add new releases at the top, under their own `## [x.y.z] - YYYY-MM-DD`
> heading.

## [0.0.1] - 2026-06-24

First public release.

### Added

- `withSatteri(options)` Next.js config wrapper: compiles `.md`/`.mdx` with
  satteri's Rust-native `mdxToJs`, extends `pageExtensions`, and wires the loader
  into both webpack and Turbopack. The Turbopack config key is version-aware
  (`experimental.turbo` < 15.3, top-level `turbopack` ≥ 15.3).
- `compileMdx(source, options)` and the underlying webpack/Turbopack loader,
  emitting React/RSC-compatible ESM (no `'use client'` needed).
- `mdx-components.tsx` provider convention via `providerImportSource`, with an
  optional no-op fallback (`satteri-nextjs/mdx-components-fallback`).
- Frontmatter and table-of-contents named exports (`frontmatter`, `toc`) on
  compiled modules; `collectHeadings` slugs headings (GitHub-style, deduped).
- `externalLinks` satteri-native hast plugin (`satteri-nextjs/plugins`).
- Serializable string/tuple plugin specs (`'pkg/mod#export'` /
  `['pkg/mod#export', options]`) that thread through Turbopack.

### Verified

- Tested against Next.js 14, 15, and 16 on both webpack and Turbopack.
