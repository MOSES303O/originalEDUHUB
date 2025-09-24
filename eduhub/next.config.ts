//next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",  // 👈 required for GitHub Pages
  images: {
    unoptimized: true, // 👈 disables Next.js image optimization (not supported on GH Pages)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ochiengsenterprise.co.ke",
        port: "8000",
        pathname: "/media/**",
      },
    ],
  },
  basePath: "/originalEDUHUB", // 👈 required if repo name != username.github.io
  assetPrefix: "/originalEDUHUB/", // 👈 ensures assets load correctly
};

export default nextConfig;
