import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native-flavoured PDF renderer runs in Node, outside the bundler.
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
