/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: isProd ? "standalone" : undefined,

  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ochiengsenterprise.co.ke",
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
      {
        protocol: "https",
        hostname: "eduhub254.com",
        pathname: "/media/**",
      }
    ],
  },

  async rewrites() {
    const isVercel = process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
    const destination = isVercel
      ? "https://originaleduhub.onrender.com/eduhub"
      : "http://localhost:8000/eduhub";

    console.log("Next.js rewrite destination:", destination);

    return [
      // SAFE API proxy (exclude Next internals)
      {
        source: "/eduhub/:path((?!_next|static).*)",
        destination: `${destination}/:path*`,
      },
      // Media proxy
      {
        source: "/media/:path*",
        destination: `${destination.replace("/eduhub", "")}/media/:path*`,
      },
    ];
  },

  webpack: (config : any) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      ignored: /node_modules/,
    };
    return config;
  },
};

export default nextConfig;
