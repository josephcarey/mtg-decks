import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        "src/**/*.test.ts",
        "src/cli.ts",
        "src/db/schema.ts",
        "src/db/queries.ts",
        "src/scryfall/bulk.ts",
      ],
      include: ["src/**/*.ts"],
      provider: "v8",
      thresholds: {
        lines: 80,
      },
    },
    include: ["src/**/*.test.ts"],
  },
});
