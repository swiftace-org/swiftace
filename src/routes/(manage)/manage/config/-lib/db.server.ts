import { sql } from "drizzle-orm"

import { db, siteConfig } from "@/lib/schema.server"
import type { BrandingSettings, SiteConfig, SiteConfigSection } from "@/types/site-config"

/** Inserts the section's row the first time it's saved, and replaces its settings after that. */
export async function upsertSiteConfigSection<S extends SiteConfigSection>(
  section: S,
  data: SiteConfig[S],
): Promise<void> {
  await db
    .insert(siteConfig)
    .values({ section, data })
    .onConflictDoUpdate({ target: siteConfig.section, set: { data, updatedAt: new Date() } })
}

/**
 * Sets some of the branding images and leaves the rest as they are, merged inside Postgres so two
 * uploads landing at once can't each write back the other's stale value.
 */
export async function mergeBrandingSettings(change: Partial<BrandingSettings>): Promise<void> {
  await db
    .insert(siteConfig)
    .values({ section: "branding", data: change })
    .onConflictDoUpdate({
      target: siteConfig.section,
      set: { data: sql`${siteConfig.data} || excluded.data`, updatedAt: new Date() },
    })
}
