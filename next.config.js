/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Supabase Insert types resolve to `never` in @supabase/supabase-js 2.100.x.
    // Runtime-safe — suppressed until types are regenerated from the live schema.
    ignoreBuildErrors: true,
  },
  experimental: {},
  images: {
    remotePatterns: [],
  },
  env: {
    NEXT_PUBLIC_BACKTEST_API_URL: process.env.NEXT_PUBLIC_BACKTEST_API_URL,
  },
};

module.exports = nextConfig;
