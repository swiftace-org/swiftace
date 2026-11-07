import { createServerFn } from "@tanstack/react-start"

import { getSiteConfig } from "@/lib/utils.server"
import type { LegalSettings } from "@/types/site-config"

import { renderMarkdown } from "../../course/-lib/utils.server"

export const loadLegalDocument = createServerFn({ method: "GET" })
  .validator((data: { document: keyof LegalSettings }) => data)
  .handler(async ({ data }) => {
    const { general, legal } = await getSiteConfig()
    const markdown = (legal[data.document] ?? "")
      .replaceAll("{{SITE_NAME}}", general.siteName)
      .replaceAll("{{SUPPORT_EMAIL}}", general.supportEmail)
    const { markup } = await renderMarkdown(markdown)
    return { markup }
  })
