import { defineConfig } from "drizzle-kit"

import { DATABASE_URL } from "./src/lib/config.server"

export default defineConfig({
  schema: "./src/lib/schema.server.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: DATABASE_URL,
  },
  verbose: true,
  strict: true,
})
