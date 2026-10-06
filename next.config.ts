import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first: about 20% smaller than WebP for the same photo, and every current browser
    // takes it. Next falls back to WebP, then the original, for anything that does not.
    formats: ["image/avif", "image/webp"],
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