import { defineConfig } from "vite-plus"

// Unit tests exercise server handlers with mocked services, without Start's RPC transforms.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Migrates TEST_DATABASE_URL, when it's set, for the tests that need a real Postgres.
  test: { globalSetup: ["test/database-setup.ts"] },
})
