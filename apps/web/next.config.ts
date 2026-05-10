import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@chickenpicks/shared', '@chickenpicks/anchor-client'],
  experimental: {
    // Allow .env at the monorepo root to be picked up by Next during dev
    externalDir: true,
  },
  // Force HTML pages to revalidate on every request so a fresh deploy
  // never gets shadowed by a stale browser cache. Static assets under
  // /_next/static/* keep their long-lived immutable caching (Next handles
  // those headers automatically).
  async headers() {
    return [
      {
        // Catch every page response (no extension or .html). Excludes
        // /_next/static which is hashed + immutable.
        source: '/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
          { key: 'CDN-Cache-Control', value: 'no-store' },
          { key: 'Vercel-CDN-Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default config;
