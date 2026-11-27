import { createServerFn } from "@tanstack/react-start"

import { STATE_DIRECTORY } from "@/lib/config.server"
import { adminMiddleware } from "@/lib/utils"
import { getSiteConfig } from "@/lib/utils.server"
import type { UpdateOverview } from "@/types/updates"

import { readLatestVersion, readUpdateStatus, VERSION } from "../-lib/utils.server"

/** Polled while an update runs too, so it has to answer again once the new release is up. */
export const loadUpdateOverview = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<UpdateOverview> => {
    const [latest, status, { updates }] = await Promise.all([
      readLatestVersion().then(
        (version) => ({ version }),
        (error: Error) => ({ error: error.message }),
      ),
      STATE_DIRECTORY ? readUpdateStatus(STATE_DIRECTORY) : null,
      getSiteConfig(),
    ])
    return {
      currentVersion: VERSION,
      latestVersion: "version" in latest ? latest.version : null,
      checkError: "error" in latest ? `Couldn't check for updates: ${latest.error}` : undefined,
      canUpdate: Boolean(STATE_DIRECTORY),
      status,
      autoUpdate: updates.autoUpdate,
    }
  })
