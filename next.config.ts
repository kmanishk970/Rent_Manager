import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Seed data points at Unsplash. Real uploads will be served from the
    // backend's storage host, which gets added here alongside it.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
