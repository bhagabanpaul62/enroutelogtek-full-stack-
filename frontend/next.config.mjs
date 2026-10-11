/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack:{},
  reactStrictMode:false,
  // Builds a self-contained server (.next/standalone) with only the files it needs,
  // so the production Docker image is much smaller. No effect on "next dev".
  output: 'standalone',

};

export default nextConfig;




