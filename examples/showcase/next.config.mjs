// Default config — used by Next.js 15 and 16 (both spell it `serverExternalPackages`).
// Next 14 builds use next.config.14.mjs instead (swapped in by CI).

import { baseConfig, externalPackages, withMdx } from './next.config.shared.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...baseConfig,
  serverExternalPackages: externalPackages,
};

export default withMdx(nextConfig);
