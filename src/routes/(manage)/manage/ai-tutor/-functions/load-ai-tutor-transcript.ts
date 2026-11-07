import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type { AiTutorTranscript } from "@/types/ai-tutor"

import { readAiTutorTranscriptMessages, readManagedAiTutorConversation } from "../-lib/db.server"
import {
  readCourseSectionSlugs,
  readCourseSectionsBySlugs,
} from "../../../../course/-lib/db.server"

/** A conversation as the learner saw it, with what each reply cost. Deleted ones included. */
export const loadAiTutorTranscript = createServerFn({ method: "GET", strict: { output: false } })
  .middleware([adminMiddleware])
  .validator((data: { conversationId: number }) => data)
  .handler(async ({ data }): Promise<AiTutorTranscript | null> => {
    if (!Number.isSafeInteger(data.conversationId)) return null
    const conversation = await readManagedAiTutorConversation(data.conversationId)
    if (!conversation) return null

    const [messages, slugs] = await Promise.all([
      readAiTutorTranscriptMessages(conversation.id),
      readCourseSectionSlugs(conversation.course.id),
    ])
    const sections = await readCourseSectionsBySlugs(conversation.course.id, slugs)
    const sectionTitles = Object.fromEntries(
      sections.map((section) => [
        section.slug,
        section.titlePrefix ? `${section.titlePrefix}: ${section.title}` : section.title,
      ]),
    )
    return { conversation, messages, sectionTitles }
  })
