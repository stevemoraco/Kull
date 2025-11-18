import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./client/src/setupTests.ts"],
     exclude: ["tests/e2e/**", "**/node_modules/**"],
     include: [
      "client/src/__tests__/**/*.test.tsx",
      "shared/__tests__/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
      "server/**/*.test.ts",
     ],
    coverage: {
      reporter: ["text", "html"],
      exclude: [
        "client/src/main.tsx",
        "client/src/vite-env.d.ts",
        "client/src/setupTests.ts",
        "client/src/**/__tests__/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
