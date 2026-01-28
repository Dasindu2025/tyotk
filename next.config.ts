import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Enable standalone output for Docker
  output: "standalone",

  // Disable x-powered-by header for smaller responses
  poweredByHeader: false,

  // Enable compression
  compress: true,

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Headers for security
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ]
  },

  // Redirect root to appropriate dashboard
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
        has: [
          {
            type: "cookie",
            key: "authjs.session-token",
            value: undefined,
          },
        ],
      },
    ]
  },
}

export default nextConfig

