import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import { getSiteConfig } from "@/lib/utils.server"
import type { AiTutorSettings } from "@/types/ai-tutor"
import type { BrandingSettings } from "@/types/site-config"

export const loadManageAiTutorPageData = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(
    async (): Promise<{
      settings: AiTutorSettings
      branding: BrandingSettings
      /** The tutor can't be switched on without it, and the page says where to turn it on. */
      openaiEnabled: boolean
    }> => {
      const { aiTutor, branding, integrations } = await getSiteConfig()
      return { settings: aiTutor, branding, openaiEnabled: integrations.openai.enabled }
    },
  )
