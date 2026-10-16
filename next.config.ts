import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The parent repo's eslint/prettier config flags cosmetic formatting
  // differences as errors; skip lint in production builds (tsc still runs).
  eslint: { ignoreDuringBuilds: true },
  images: {
    // Local public/ images need no remote config.
    // Add remotePatterns here if product images move to a CDN later.
  },
};

export default nextConfig;
