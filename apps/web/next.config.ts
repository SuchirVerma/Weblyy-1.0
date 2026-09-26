import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Loaded at runtime from the installed package; it drives the machine's own Chrome.
  serverExternalPackages: ["playwright-core"],
};

export default nextConfig;
