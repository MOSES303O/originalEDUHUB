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
  basePath: "",
  assetPrefix: "",
  outputFileTracingRoot: path.join(__dirname, ".."),

  //rember to set NEXT_PUBLIC_API_BASE_URL_GLOBAL and NEXT_PUBLIC_API_BASE_URL_LOCAL in your environment variables
  async rewrites() {
    const destination = isVercel
      ?  'https://originaleduhub.onrender.com/API/v1'
      : 'http://localhost:8000/api/v1'
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