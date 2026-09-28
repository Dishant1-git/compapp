import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Companion face matching: load these with plain Node require (they read model
  // and .wasm files from node_modules at runtime) instead of bundling them.
  serverExternalPackages: ["@vladmandic/face-api", "@tensorflow/tfjs", "@tensorflow/tfjs-backend-wasm", "sharp"],
  experimental: {
    serverActions: {
      // Companion photo and selfie uploads (resized in the browser to well under 2 MB each).
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
