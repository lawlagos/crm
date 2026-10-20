import type { NextConfig } from 'next';

const config: NextConfig = {
  distDir: process.env.CENTRAL_BUILD_DIR || '.next',
  turbopack: { root: process.cwd() },
  serverExternalPackages: ['better-sqlite3', 'pino'],
  poweredByHeader: false,
  devIndicators: false,
};
export default config;
