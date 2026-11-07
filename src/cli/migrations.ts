import { readFile } from "node:fs/promises"

// The database migrations in `drizzle/`, embedded in the binary, applied with drizzle's own
// migrator and recorded in the same `drizzle.__drizzle_migrations` table as `drizzle-kit migrate`.
import { sql } from "drizzle-orm"
import type { MigrationConfig } from "drizzle-orm/migrator"
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import { PgDialect } from "drizzle-orm/pg-core"
import pg from "pg"

import { readMigrations } from "./embed.ts" with { type: "macro" }
import { parseEnvFile } from "./env-file.ts"
import { ENV_FILE } from "./paths.ts"
import { CommandError, fail } from "./shell.ts"

const MIGRATIONS = readMigrations()
type Database = NodePgDatabase & { $client: pg.Client }
// The folder is only read by drizzle's readMigrationFiles, which the macro ran at build time.
const CONFIG: MigrationConfig = {
  migrationsFolder: "drizzle",
  migrationsSchema: "drizzle",
  migrationsTable: "__drizzle_migrations",
}

/**
 * The database a command works on: DATABASE_URL, or on a server that `swiftace deploy` set up,
 * the service's own from its env file, so `sudo swiftace make-admin` needs nothing more.
 */
export async function commandDatabaseUrl(): Promise<string> {
  const url = process.env.DATABASE_URL?.trim()
  if (url) return url
  const text = await readFile(ENV_FILE, "utf8").catch(() => "")
  const fromFile = parseEnvFile(text).get("DATABASE_URL")
  if (fromFile) return fromFile
  fail(
    `Set DATABASE_URL to the site's Postgres database${text ? "" : ` (or run it as root, to use ${ENV_FILE}'s)`}`,
  )
}

/**
 * Opens a connection for one command and closes it after. A database that can't be reached is
 * reported with its message alone, without the URL, which holds the password.
 */
export async function withDatabase<T>(
  url: string,
  query: (db: Database) => Promise<T>,
): Promise<T> {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10_000 })
  try {
    await client.connect()
  } catch (error) {
    throw new CommandError(`Couldn't connect to DATABASE_URL: ${(error as Error).message}`)
  }
  try {
    return await query(drizzle(client))
  } finally {
    await client.end()
  }
}

/**
 * The migrations that haven't run, by drizzle's rule: those newer than the last one recorded. A
 * database whose baseline was recorded by hand, rather than run, so has nothing to apply.
 */
export async function pendingMigrations(db: Database): Promise<string[]> {
  const { rows } = await db
    .execute<{ created_at: string | null }>(sql`
    select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1
  `)
    .catch((error: { code?: string; cause?: { code?: string } }) => {
      // 42P01 and 3F000: there's no migrations table or schema yet, so nothing has run.
      const code = error.code ?? error.cause?.code
      if (code === "42P01" || code === "3F000") return { rows: [] }
      throw error
    })
  const last = Number(rows[0]?.created_at ?? -Infinity)
  return MIGRATIONS.filter((migration) => migration.folderMillis > last).map(({ tag }) => tag)
}

/** Applies the pending migrations in one transaction, and returns their names. */
export async function applyMigrations(db: Database): Promise<string[]> {
  const pending = await pendingMigrations(db)
  // What drizzle-orm/node-postgres/migrator does, with the migrations from the binary.
  const session = db._.session as unknown as Parameters<PgDialect["migrate"]>[1]
  if (pending.length) await new PgDialect().migrate(MIGRATIONS, session, CONFIG)
  return pending
}
