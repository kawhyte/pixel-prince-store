import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Sanity Studio is built on styled-components, and without this the server and the browser
   * generate different class-name hashes for the same component. React reports that as
   * "a tree hydrated but some attributes ... didn't match" on every /studio load, pointing at
   * Studio's own loading spinner. The storefront is Tailwind and uses none of this.
   */
  compiler: { styledComponents: true },

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