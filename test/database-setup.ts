// Vitest's global setup: migrates TEST_DATABASE_URL once, before the test files that use it run
// in parallel, since two migrators on an empty database would race to create the same tables.
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import pg from "pg"

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL
  if (!url) return
  const pool = new pg.Pool({ connectionString: url })
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" })
  } finally {
    await pool.end()
  }
}
