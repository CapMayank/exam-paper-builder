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
  // Browser-side protections for every page and API response.
  async headers() {
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ...(process.env.NODE_ENV === "production"
        ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
        : []),
    ];
    return [
      { source: "/:path*", headers: security },
      // signed-in data must never be kept by shared caches
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      // conditional ETag endpoint: still private (no shared caches), revalidated via If-None-Match
      { source: "/api/questions/texts", headers: [{ key: "Cache-Control", value: "private, no-cache" }] },
    ];
  },
  async redirects() {
    return [
      {
        source: "/print",
        destination: "/papers",
        permanent: false,
      },
      // the old compact view is the print view with the Compact density
      {
        source: "/papers/:id/compact",
        destination: "/papers/:id/print",
        permanent: false,
      },
      // the old Exam Cell page was replaced by Exams
      {
        source: "/exam-cell",
        destination: "/exams",
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
