import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // WebP only: AVIF at default settings smears thin map linework and small text.
    formats: ["image/webp"],
    // Up to 3000, the width of the Etsy mockup originals, so a 2x/3x screen can get them whole.
    deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920, 2048, 2560, 3000],
    imageSizes: [96, 128, 160, 256, 384, 480],
    // 90 is the product-photo quality; 75 looks soft on map detail.
    qualities: [75, 90],
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