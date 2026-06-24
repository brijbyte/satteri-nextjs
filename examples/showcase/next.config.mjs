/** @type {import('next').NextConfig} */
const nextConfig = {
  // satteri ships a native/wasi binary — keep it out of the server bundle so
  // Next doesn't try to bundle the binding. (Once milestone 2 lands, this app
  // will also wrap the config with `withSatteri(...)` to render real .mdx pages.)
  serverExternalPackages: ['satteri', 'satteri-nextjs'],
};

export default nextConfig;
