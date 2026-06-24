import withSatteri from 'satteri-nextjs';

// Milestone 2: wrap the config so real `.md`/`.mdx` page files compile through
// the satteri loader (webpack rule + Turbopack rule + pageExtensions).
const withMdx = withSatteri({
  features: { gfm: true, frontmatter: true },
  // Plugin referenced by a serializable string spec, so it applies under BOTH
  // webpack and Turbopack (an imported `externalLinks()` would be webpack-only).
  // Rewrites off-site links with target/rel across every .mdx page.
  hastPlugins: ['satteri-nextjs/plugins#externalLinks'],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The /milestone-1 page imports satteri at runtime (evaluate/compileMdx), so
  // keep the native binary out of the server bundle.
  serverExternalPackages: ['satteri', 'satteri-nextjs'],
};

export default withMdx(nextConfig);
