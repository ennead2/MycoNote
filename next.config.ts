import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";
import pkg from "./package.json" with { type: "json" };

// Vercel は build 時に VERCEL_GIT_COMMIT_SHA を自動注入する。
// ローカル build では git rev-parse に fallback（失敗しても build は続行）。
function resolveCommitSha(): string {
  const vercelSha = process.env.VERCEL_GIT_COMMIT_SHA;
  if (vercelSha) return vercelSha.slice(0, 7);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require("node:child_process");
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "dev";
  }
}

const APP_VERSION = pkg.version;
const APP_COMMIT = resolveCommitSha();

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  turbopack: {},
  env: {
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
    NEXT_PUBLIC_APP_COMMIT: APP_COMMIT,
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
})(nextConfig);
