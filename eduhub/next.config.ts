import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone", // Required for GitHub Pages
  images: {
    unoptimized: true, // Disables Next.js image optimization (not supported on GH Pages)
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ochiengsenterprise.co.ke",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/media/**",
      },
    ],
  },
  basePath: "/originalEDUHUB", // Required if repo name != username.github.io
  assetPrefix: "/originalEDUHUB/", // Ensures assets load correctly
  outputFileTracingRoot: path.join(__dirname, ".."), // Points to originalEDUHUB root
};

export default nextConfig;