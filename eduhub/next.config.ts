// frontend/next.config.js
/** @type {import('next').NextConfig} */
import path from "path";

const isVercel = process.env.VERCEL === "1";

const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
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
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "*.onrender.com",
        pathname: "/media/**",
      },
    ],
  },
  basePath: isVercel ? "" : "/originalEDUHUB",
  assetPrefix: isVercel ? "" : "/originalEDUHUB/",
  outputFileTracingRoot: path.join(__dirname, ".."),
  async rewrites() {
    const destination = isVercel
      ? (process.env.NEXT_PUBLIC_API_URL || "https://your-backend.onrender.com/api/v1")
      : "http://localhost:8000/api/v1";
    console.log('Next.js rewrite destination:', destination);
    return [
      {
        source: "/api/v1/:path*",
        destination: `${destination}/:path*`,
      },
    ];
  },
};

export default nextConfig;