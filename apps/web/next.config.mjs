const nextConfig = {
  // Lets a test build go somewhere other than the .next folder a running server is using.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Loaded at runtime from the installed package; it drives the machine's own Chrome (or, on Vercel, serverless Chromium).
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    // Chromium's compressed binary is read from disk at runtime, and the built-in demo salon is read from public/.
    "/api/**/*": ["./node_modules/@sparticuz/chromium/bin/**", "./node_modules/playwright-core/**", "./public/demo/**"],
  },
};
export default nextConfig;
