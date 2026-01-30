/** @type {import('next').NextConfig} */
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

  async rewrites() {
    const isVercel = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
    const destination = isVercel
      ? "https://originaleduhub.onrender.com/eduhub"
      : "http://localhost:8000/eduhub";

    console.log("Next.js rewrite destination:", destination);

    return [
      // ONLY PROXY API CALLS — NOT YOUR NEXT.JS PAGES!
      {
        source: "/eduhub/:path*",
        destination: `${destination}/:path*`,
      },
      // Optional: proxy media files directly
      {
        source: "/media/:path*",
        destination: `${destination.replace("/eduhub", "")}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;