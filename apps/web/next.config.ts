import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@chickenpicks/shared', '@chickenpicks/anchor-client'],
  experimental: {
    // Allow .env at the monorepo root to be picked up by Next during dev
    externalDir: true,
  },
};

export default config;
