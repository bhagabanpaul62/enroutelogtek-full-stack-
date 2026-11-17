/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack:{},
  reactStrictMode:false,
  // Builds a self-contained server (.next/standalone) with only the files it needs,
  // so the production Docker image is much smaller. No effect on "next dev".
  output: 'standalone',
  // Playwright builds into its own folder so it can run beside `next dev` (which owns .next).
  distDir: process.env.NEXT_DIST_DIR || '.next',

};

export default nextConfig;




