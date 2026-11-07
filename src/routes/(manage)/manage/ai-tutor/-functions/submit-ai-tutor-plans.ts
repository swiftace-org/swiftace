import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache, getSiteConfig } from "@/lib/utils.server"
import type { AiTutorSettings } from "@/types/ai-tutor"

import { toAiTutorPlans } from "../-lib/utils"
import { upsertSiteConfigSection } from "../../config/-lib/db.server"

export const submitAiTutorPlans = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: AiTutorSettings["plans"] }) => data)
  .handler(async ({ data }) => {
    clearSiteConfigCache()
    const { aiTutor } = await getSiteConfig()
    const result = toAiTutorPlans(data.values, aiTutor.models)
    if ("error" in result) return result

    try {
      await upsertSiteConfigSection("aiTutor", { ...aiTutor, plans: result.settings })
    } catch (error) {
      console.error("submitAiTutorPlans: save failed", error)
      return { error: "Could not save the plans. Please try again." }
    }
    clearSiteConfigCache()
    return { settings: result.settings }
  })
