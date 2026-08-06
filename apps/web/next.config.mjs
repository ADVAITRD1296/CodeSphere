/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@codesphere/shared'],
  reactStrictMode: false // Recommended for Yjs & Monaco binding to prevent duplicate socket connections
};

export default nextConfig;
