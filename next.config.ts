import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow fs module in API routes (server-side only)
  serverExternalPackages: [],
  // Disable static optimization for API routes that use fs
  experimental: {},
};

export default nextConfig;
