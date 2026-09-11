import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
        port: "",
        pathname: "/**",
      },
    ],
  },

  async redirects() {
    return [
      {
        source: "/product/free-print",
        destination: "/free-downloads",
        permanent: true, // 308 redirect for SEO preservation
      },
      {
        source: "/product/:slug",
        destination: "/free-downloads",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;