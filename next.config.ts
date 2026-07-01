import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/search',
        destination: '/explore',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
