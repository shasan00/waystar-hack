import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enables the Dockerfile runner stage to run `node server.js`.
  // Safe to keep even when deploying to Vercel — Vercel ignores it.
  output: "standalone",
};

export default nextConfig;
