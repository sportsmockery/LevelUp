import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/tradingview',
        destination: 'https://v0-dashboard-build-two.vercel.app/',
      },
      {
        source: '/tradingview/:path*',
        destination: 'https://v0-dashboard-build-two.vercel.app/:path*',
      },
    ];
  },
};

export default nextConfig;
