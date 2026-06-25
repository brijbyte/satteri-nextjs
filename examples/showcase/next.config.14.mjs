// Next.js 14 config. Next 14 has no `serverExternalPackages` key — it uses
// `experimental.serverComponentsExternalPackages` instead. Imports everything
// else from the shared module. CI copies this over next.config.mjs for the
// Next 14 build leg (next has no --config flag to point at it directly).

import { baseConfig, externalPackages, withMdx } from './next.config.shared.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...baseConfig,
  experimental: { serverComponentsExternalPackages: externalPackages },
};

export default withMdx(nextConfig);
