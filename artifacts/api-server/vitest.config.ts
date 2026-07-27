import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run in Node environment (no DOM needed for API tests)
    environment: "node",
    // Globals so we can use describe/it/expect without importing
    globals: false,
    // Disable pino-pretty transport in tests by pretending we're in production
    env: {
      NODE_ENV: "production",
      LOG_LEVEL: "silent",
      ADMIN_USER_IDS: "admin-clerk-id",
      ADMIN_PASSCODE: "test-passcode-secret",
    },
  },
});
