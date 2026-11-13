// `swiftace migrate [--dry-run]`: applies the database migrations that haven't run yet, or with
// --dry-run, lists them. `start` refuses to run until there are none.
import { readFile } from "node:fs/promises"

import { ensureAuthenticationKeys } from "./authentication-keys.ts"
import { parseEnvFile } from "./env-file.ts"
import {
  applyMigrations,
  commandDatabaseUrl,
  pendingMigrations,
  withDatabase,
} from "./migrations.ts"
import { ENV_FILE } from "./paths.ts"

export async function migrate(dryRun: boolean) {
  const names = await withDatabase(await commandDatabaseUrl(), async (db) => {
    if (dryRun) return pendingMigrations(db)
    const names = await applyMigrations(db)
    const serviceEnv = process.env.DATABASE_URL?.trim()
      ? {}
      : Object.fromEntries(parseEnvFile(await readFile(ENV_FILE, "utf8").catch(() => "")))
    await ensureAuthenticationKeys(db, { ...serviceEnv, ...process.env })
    return names
  })
  if (!names.length) return console.log("The database has no migrations to apply")
  console.log(dryRun ? "To apply:" : "Applied:")
  for (const name of names) console.log(`  ${name}`)
}
