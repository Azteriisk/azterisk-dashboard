import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Ensure server components can import catalog files safely
  serverExternalPackages: [],
};

export default nextConfig;
