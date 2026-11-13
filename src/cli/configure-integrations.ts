import { readFile } from "node:fs/promises"

import { sql } from "drizzle-orm"

import { DEFAULT_INTEGRATION_SETTINGS } from "../lib/config.ts"
import { toIntegrationSettings } from "../routes/(manage)/manage/config/-lib/utils.server.ts"
import type { IntegrationSettings } from "../types/site-config.ts"
import { commandDatabaseUrl, withDatabase } from "./migrations.ts"
import { CommandError, fail } from "./shell.ts"

/** A local file avoids putting credentials in command history or printing them to the terminal. */
export async function configureIntegrations(path: string | undefined) {
  if (!path) fail("Usage: swiftace configure-integrations <file.json>")
  let values: Partial<IntegrationSettings>
  try {
    values = JSON.parse(await readFile(path, "utf8"))
    if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error()
  } catch {
    fail("Could not read the integrations JSON file. Check its path and JSON syntax.")
  }
  try {
    await withDatabase(await commandDatabaseUrl(), async (db) => {
      await db.transaction(async (tx) => {
        await tx.execute(
          sql`insert into site_config (section, data) values ('integrations', '{}') on conflict (section) do nothing`,
        )
        const { rows } = await tx.execute<{ data: Partial<IntegrationSettings> }>(
          sql`select data from site_config where section = 'integrations' for update`,
        )
        const stored = { ...DEFAULT_INTEGRATION_SETTINGS, ...rows[0]?.data }
        const result = toIntegrationSettings(values, stored)
        if ("error" in result) fail(result.error)
        await tx.execute(
          sql`update site_config set data = ${JSON.stringify(result.settings)}::jsonb where section = 'integrations'`,
        )
      })
    })
  } catch (error) {
    if (error instanceof CommandError) throw error
    fail(
      "Could not save integration settings. Check the configuration fields and database, and run swiftace migrate first.",
    )
  }
  console.log("Integration settings saved. A running server picks them up within a minute.")
}
