import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async redirects() {
    return [
      // College Scout uses relative asset paths (./assets/...). Without a
      // trailing slash, the browser resolves them against '/' instead of
      // '/scout/', breaking asset loading. Force the trailing slash.
      { source: '/scout', destination: '/scout/', permanent: false },
    ];
  },
  async rewrites() {
    return [
      // Serve public/scout/index.html for the SPA entry.
      { source: '/scout/', destination: '/scout/index.html' },
    ];
  },
};

export default nextConfig;
