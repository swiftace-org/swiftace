import { randomBytes } from "node:crypto"

import { sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"

import { AUTHENTICATION_CONFIG_SECTION } from "../routes/(auth)/-lib/constants.ts"
import { fail } from "./shell.ts"

/** Existing database keys win, including when two deploys initialize the same database at once. */
export async function ensureAuthenticationKeys(
  db: Pick<NodePgDatabase, "execute">,
  env: Record<string, string | undefined>,
): Promise<void> {
  const keys = {
    signingKey: env.JWT_SECRET_KEY?.trim() ? env.JWT_SECRET_KEY : randomBytes(32).toString("hex"),
    hashKey: env.HASH_SECRET_KEY?.trim() ? env.HASH_SECRET_KEY : randomBytes(32).toString("hex"),
  }
  try {
    await db.execute(sql`
      insert into site_config (section, data) values (${AUTHENTICATION_CONFIG_SECTION}, ${JSON.stringify(keys)}::jsonb)
      on conflict (section) do update set data = site_config.data || jsonb_build_object(
        'signingKey', case when jsonb_typeof(site_config.data -> 'signingKey') = 'string'
          and length(btrim(site_config.data ->> 'signingKey')) > 0
          then site_config.data -> 'signingKey' else excluded.data -> 'signingKey' end,
        'hashKey', case when jsonb_typeof(site_config.data -> 'hashKey') = 'string'
          and length(btrim(site_config.data ->> 'hashKey')) > 0
          then site_config.data -> 'hashKey' else excluded.data -> 'hashKey' end
      )
    `)
  } catch {
    fail("Could not initialize authentication keys in the deployment database.")
  }
}
