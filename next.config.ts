import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return [
      {
        source: "/print",
        destination: "/papers",
        permanent: false,
      },
      {
        source: "/solutions",
        destination: "/papers",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
