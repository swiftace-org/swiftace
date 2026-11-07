// `swiftace migrate [--dry-run]`: applies the database migrations that haven't run yet, or with
// --dry-run, lists them. `start` refuses to run until there are none.
import {
  applyMigrations,
  commandDatabaseUrl,
  pendingMigrations,
  withDatabase,
} from "./migrations.ts"

export async function migrate(dryRun: boolean) {
  const names = await withDatabase(
    await commandDatabaseUrl(),
    dryRun ? pendingMigrations : applyMigrations,
  )
  if (!names.length) return console.log("The database has no migrations to apply")
  console.log(dryRun ? "To apply:" : "Applied:")
  for (const name of names) console.log(`  ${name}`)
}
