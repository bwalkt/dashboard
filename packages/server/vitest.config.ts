import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "c8",
      reporter: ["text", "json", "html"],
      exclude: [
        "dist/**",
        "test/**",
        "migrations/**",
        "**/*.d.ts",
        "vitest.config.ts",
      ],
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
