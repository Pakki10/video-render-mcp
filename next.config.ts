import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: [
    "remotion",
    "@remotion/renderer",
    "@remotion/bundler",
    "@remotion/cli",
    "msedge-tts",
  ],
};

export default nextConfig;
