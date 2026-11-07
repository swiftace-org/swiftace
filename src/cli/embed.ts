// Bun macros, run when the binary is built (and when `bun src/cli/index.ts` loads them), which
// inline the files the CLI reads into the code, so the binary needs nothing beside it.
import { readFileSync } from "node:fs"
import { join } from "node:path"

import { readMigrationFiles, type MigrationMeta } from "drizzle-orm/migrator"

const ROOT = join(import.meta.dirname, "../..")

/** `drizzle/`'s migrations as drizzle's own migrator reads them, so the hashes match. */
export function readMigrations(): (MigrationMeta & { tag: string })[] {
  const folder = join(ROOT, "drizzle")
  const journal = JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8")) as {
    entries: { tag: string }[]
  }
  return readMigrationFiles({ migrationsFolder: folder }).map((migration, i) => ({
    ...migration,
    tag: journal.entries[i]!.tag,
  }))
}

/** The page the notebook preview server serves (see preview.ts). */
export function readPreviewPage(): string {
  return readFileSync(join(import.meta.dirname, "preview/index.html"), "utf8")
}
