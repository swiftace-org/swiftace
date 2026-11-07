import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { clearSiteConfigCache, getSiteConfig } from "@/lib/utils.server"
import type { AiTutorModel } from "@/types/ai-tutor"

import { toAiTutorModels } from "../-lib/utils"
import { upsertSiteConfigSection } from "../../config/-lib/db.server"

export const submitAiTutorModels = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { values: AiTutorModel[] }) => data)
  .handler(async ({ data }) => {
    clearSiteConfigCache()
    const { aiTutor } = await getSiteConfig()
    const result = toAiTutorModels(data.values, aiTutor.plans)
    if ("error" in result) return result

    try {
      await upsertSiteConfigSection("aiTutor", { ...aiTutor, models: result.settings })
    } catch (error) {
      console.error("submitAiTutorModels: save failed", error)
      return { error: "Could not save the models. Please try again." }
    }
    clearSiteConfigCache()
    return { settings: result.settings }
  })
