import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Skip generating static 404 page to avoid NextAuth compatibility issues
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
