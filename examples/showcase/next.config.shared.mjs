// Common, version-agnostic config shared by every next.config.*.mjs variant.
// The per-version configs import these pieces and only differ in how they
// declare server-external packages (the key was renamed between Next 14 → 15).

import withSatteri from 'satteri-nextjs';

// Milestone 2: wrap the config so real `.md`/`.mdx` page files compile through
// the satteri loader (webpack rule + Turbopack rule + pageExtensions).
export const withMdx = withSatteri({
  features: { gfm: true, frontmatter: true },
  // Plugin referenced by a serializable string spec, so it applies under BOTH
  // webpack and Turbopack (an imported `externalLinks()` would be webpack-only).
  // Rewrites off-site links with target/rel across every .mdx page.
  hastPlugins: ['satteri-nextjs/plugins#externalLinks'],
});

// The /milestone-1 page imports satteri at runtime (evaluate/compileMdx), so
// keep the native binary out of the server bundle. The key that consumes this
// list differs by Next version — see each variant.
export const externalPackages = ['satteri', 'satteri-nextjs'];

// Common nextConfig keys that don't change across versions. Variants spread
// this, then add their version-specific server-external key.
/** @type {import('next').NextConfig} */
export const baseConfig = {};
