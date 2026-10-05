import type { NextConfig } from "next";

// Sent with every response. Strict-Transport-Security is production-only so
// local http://localhost keeps working.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Our pages are never shown inside another site's frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera for the Companion selfie and location for "near me"; nothing else.
  { key: "Permissions-Policy", value: "camera=(self), geolocation=(self), microphone=(), browsing-topics=()" },
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Companion face matching and photo moderation: load these with plain Node require
  // (they read model and .wasm files from node_modules at runtime, and must share one
  // TensorFlow instance) instead of bundling them.
  serverExternalPackages: [
    "@vladmandic/face-api",
    "@tensorflow/tfjs",
    "@tensorflow/tfjs-backend-wasm",
    "nsfwjs",
    "sharp",
    // A 2.4 MB list of temporary-email domains: read from node_modules, not bundled.
    "disposable-email-domains",
  ],
  experimental: {
    serverActions: {
      // Companion photo and selfie uploads (resized in the browser to well under 2 MB each),
      // and up to two ID photos per booking for the age check.
      bodySizeLimit: "5mb",
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Frontend/backend split (see src/lib/remote.ts): on the frontend deployment the
  // API routes (images, ID documents, chat polling, token login, webhooks) are
  // served by the backend. The internal bridge endpoint is not exposed this way.
  async rewrites() {
    const backend = process.env.BACKEND_URL?.trim().replace(/\/+$/, "");
    return {
      beforeFiles: backend
        ? [{ source: "/api/:path((?!internal/).*)", destination: `${backend}/api/:path` }]
        : [],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
