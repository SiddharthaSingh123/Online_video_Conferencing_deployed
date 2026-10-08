import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is left off on purpose: it keeps visited pages alive in the background
  // with their old state, which left buttons stuck (e.g. "New meeting") after navigating back.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
