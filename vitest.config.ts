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
      "scripts/review-v2/**",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
