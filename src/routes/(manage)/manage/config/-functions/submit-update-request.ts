import { createServerFn } from "@tanstack/react-start"

import { STATE_DIRECTORY } from "@/lib/config.server"
import { adminMiddleware } from "@/lib/utils"

import { writeUpdateRequest } from "../-lib/utils.server"

/**
 * Only asks: swiftace-update.service, as root, installs the latest release and restarts this
 * server, so the page polls `loadUpdateOverview` to see how it went.
 */
export const submitUpdateRequest = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async (): Promise<{ requestedAt: string } | { error: string }> => {
    if (!STATE_DIRECTORY) return { error: NOT_DEPLOYED_ERROR }
    try {
      return { requestedAt: await writeUpdateRequest(STATE_DIRECTORY) }
    } catch (error) {
      console.error("submitUpdateRequest: couldn't write the request", error)
      return { error: "Could not start the update. Please try again." }
    }
  })

const NOT_DEPLOYED_ERROR =
  "This server wasn't set up with swiftace deploy, so it can't update itself. Run swiftace upgrade, then restart it."
