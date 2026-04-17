import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true,
    css: true,
    testTimeout: 15000,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "e2e/**",
      ".worktrees/**",
      ".claude/**",
      "scripts/review-v2/**",
      // Phase 14 scripts use node:test runner, not vitest
      "scripts/phase14/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
