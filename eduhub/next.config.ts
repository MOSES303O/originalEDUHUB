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
      { protocol: "https", hostname: "*.onrender.com", pathname: "/media/**" },
      { protocol: "http", hostname: "localhost", port: "8000", pathname: "/media/**" },
    ],
  },
  basePath: "",

  //rember to set NEXT_PUBLIC_API_BASE_URL_GLOBAL and NEXT_PUBLIC_API_BASE_URL_LOCAL in your environment variables
  async rewrites() {
    const isVercel =  process.env.NEXT_PUBLIC_VERCEL_ENV === "production";
    const destination = isVercel
      ?  'https://originaleduhub.onrender.com/eduhub'
      : 'http://localhost:8000/eduhub'
    console.log('Next.js rewrite destination:', destination);
    return [
      {
        source: "/eduhub/:path*",
        destination: `${destination}/:path*`,
      },
    ];
  },
};

export default nextConfig;