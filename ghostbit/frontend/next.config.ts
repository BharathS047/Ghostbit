import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async redirects() {
    return [
      {
        source: "/reset-password",
        destination: "/forgot-password",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
