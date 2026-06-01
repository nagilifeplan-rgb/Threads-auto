import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow fs module in API routes (server-side only)
  serverExternalPackages: [],
  // Disable static optimization for API routes that use fs
  experimental: {},
  // Allow Genspark sandbox domains as dev origins
  allowedDevOrigins: [
    '*.sandbox.novita.ai',
    '*.e2b.dev',
    '*.genspark.ai',
  ],
};

export default nextConfig;
