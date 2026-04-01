/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
  images: {
    remotePatterns: [],
  },
  env: {
    NEXT_PUBLIC_BACKTEST_API_URL: process.env.NEXT_PUBLIC_BACKTEST_API_URL,
  },
};

module.exports = nextConfig;
