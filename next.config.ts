import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Portfolio uploads go through a server action (up to several photos at once).
  experimental: { serverActions: { bodySizeLimit: "40mb" } },
};

export default nextConfig;
