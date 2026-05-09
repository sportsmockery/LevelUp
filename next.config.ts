import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      // Serve College Scout SPA at /scout (no redirect needed because the
      // SPA is now built with absolute base path /scout/, so assets resolve
      // correctly regardless of trailing slash).
      { source: '/scout', destination: '/scout/index.html' },
      { source: '/scout/', destination: '/scout/index.html' },
    ];
  },
};

export default nextConfig;
