/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    instrumentationHook: true,
  },
  env: {
    APP_VERSION: process.env.APP_VERSION || 'v0.0.0-dev',
  },
};

module.exports = nextConfig;
