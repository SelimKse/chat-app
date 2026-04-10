import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      thresholds: {
        lines: 40,
        statements: 40,
        branches: 56,
        functions: 40,
      },
    },
  },
});
