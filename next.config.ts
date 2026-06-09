import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Bundle the ffmpeg-static binary with the OLIQ server-side frame extractor
  // so the executable is present in the serverless function at runtime.
  outputFileTracingIncludes: {
    '/api/ol/extract': ['./node_modules/ffmpeg-static/ffmpeg'],
  },
  async rewrites() {
    return [
      // Serve College Scout SPA at /scout (no redirect needed because the
      // SPA is now built with absolute base path /scout/, so assets resolve
      // correctly regardless of trailing slash).
      { source: '/scout', destination: '/scout/index.html' },
      { source: '/scout/', destination: '/scout/index.html' },
      // SPA deep-route fallback: anything under /scout/<path> that is NOT a
      // built asset (assets/*, *.js, *.css, *.ico, etc.) gets served the SPA
      // shell so React Router can take over. The negative-lookahead keeps the
      // real bundle files (and any future api routes) from being swallowed.
      {
        source: '/scout/:path((?!assets/|api/|index\\.html$|favicon\\.ico$|.*\\.(?:js|css|map|png|jpg|jpeg|svg|webp|woff2?|ttf)$).+)',
        destination: '/scout/index.html',
      },
    ];
  },
};

export default nextConfig;
