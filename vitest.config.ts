import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Integration test self-gates via describe.skipIf(!process.env.LLMLINGUA_INTEGRATION).
    // It's collected but skipped unless the env var is set.
    environment: "node",
    testTimeout: 30_000,
  },
});
