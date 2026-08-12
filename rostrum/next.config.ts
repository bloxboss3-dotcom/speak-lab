import type { NextConfig } from 'next'

const config: NextConfig = {
  reactStrictMode: true,
  // The coaching route holds the API key, so this app needs a server. Vercel is
  // the intended target; `next start` behind anything else works identically.
  poweredByHeader: false,
}

export default config
