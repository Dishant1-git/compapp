import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Companion face matching and photo moderation: load these with plain Node require
  // (they read model and .wasm files from node_modules at runtime, and must share one
  // TensorFlow instance) instead of bundling them.
  serverExternalPackages: [
    "@vladmandic/face-api",
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-backend-wasm",
    "nsfwjs",
    "sharp",
  ],
  experimental: {
    serverActions: {
      // Companion photo and selfie uploads (resized in the browser to well under 2 MB each).
      bodySizeLimit: "3mb",
    },
  },
};

export default nextConfig;
