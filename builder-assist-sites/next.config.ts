import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Vinext currently evaluates every multipart App Router POST against the
      // server-action guard before dispatching route handlers. Keep that guard
      // bounded, but above Gen1's 80 MB plan-set limit plus multipart overhead.
      bodySizeLimit: "85mb",
    },
  },
};

export default nextConfig;
