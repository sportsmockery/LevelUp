import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      // College Scout SPA — serve public/scout/index.html for the app entry.
      // Hash routing means deep links live at /scout#/profile etc., so all
      // top-level paths under /scout (except /scout/assets/*) resolve to the index.
      { source: '/scout', destination: '/scout/index.html' },
      { source: '/scout/', destination: '/scout/index.html' },
    ];
  },
};

export default nextConfig;
