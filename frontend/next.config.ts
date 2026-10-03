import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  compress: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-ac890c5c0f3983b20fb2ac20a82ce701.r2.dev',
      },
      {
        protocol: 'http',
        hostname: 'vid.flairloop.com',
      },
      {
        protocol: 'https',
        hostname: 'vid.flairloop.com',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    const backendUrl = process.env.BACKEND_INTERNAL_URL || "http://omni-backend:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/outputs/:path*",
        destination: `${backendUrl}/outputs/:path*`,
      },
      {
        source: "/docs",
        destination: `${backendUrl}/docs`,
      },
      {
        source: "/redoc",
        destination: `${backendUrl}/redoc`,
      },
      {
        source: "/openapi.json",
        destination: `${backendUrl}/openapi.json`,
      },
    ];
  },
};

export default nextConfig;
