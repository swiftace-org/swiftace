import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache, getSiteConfig } from "@/lib/utils.server"

import { type AiTutorGeneralSettings, toAiTutorGeneralSettings } from "../-lib/utils"
import { upsertSiteConfigSection } from "../../config/-lib/db.server"

export const submitAiTutorGeneralSettings = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: AiTutorGeneralSettings }) => data)
  .handler(async ({ data }) => {
    const result = toAiTutorGeneralSettings(data.values)
    if ("error" in result) return result

    // Fresh, so this tab's save can't write back a stale copy of the plans or models.
    clearSiteConfigCache()
    const { aiTutor, integrations } = await getSiteConfig()
    if (result.settings.enabled && !integrations.openai.enabled) {
      return { error: "Turn on the OpenAI integration in Manage Config before turning this on." }
    }
    try {
      await upsertSiteConfigSection("aiTutor", { ...aiTutor, ...result.settings })
    } catch (error) {
      console.error("submitAiTutorGeneralSettings: save failed", error)
      return { error: "Could not save the AI tutor's settings. Please try again." }
    }
    clearSiteConfigCache()
    return { settings: result.settings }
  })
