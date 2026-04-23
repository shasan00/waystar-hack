import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables the Dockerfile runner stage to run `node server.js`.
  // Safe to keep even when deploying to Vercel — Vercel ignores it.
  output: "standalone",
  async headers() {
    return [
      {
        source: "/pay/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
        ],
      },
    ];
  },
};

export default nextConfig;
