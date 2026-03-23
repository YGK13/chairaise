/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enable static export for Vercel edge deployment
  output: undefined, // Use default server mode for API routes
};

export default nextConfig;
