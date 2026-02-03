import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Optimized for Docker/Railway deployment
};

export default nextConfig;
