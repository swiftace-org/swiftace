import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"
import { readCourseForViewer } from "@/lib/utils.server"
import type { AiTutorConversation } from "@/types/ai-tutor"

import { toDisplayMessages } from "../-lib/ai-tutor"
import { AI_TUTOR_HISTORY_MAX_MESSAGES } from "../-lib/constants"
import { readAiTutorConversation, readAiTutorMessages } from "../-lib/db.server"

/** A past conversation to pick up again, as long as it's the learner's own and in this course. */
// Strict output typing rejects `UIMessage`s open-ended `metadata`; it is plain JSON here.
export const loadAiTutorConversation = createServerFn({ method: "GET", strict: { output: false } })
  .middleware([authMiddleware])
  .validator((data: { courseSlug: string; conversationId: number }) => data)
  .handler(async ({ data, context }): Promise<AiTutorConversation | { error: string }> => {
    const viewer = await readCourseForViewer(data.courseSlug)
    const conversation = viewer
      ? await readAiTutorConversation(data.conversationId, context.account.id, viewer.course.id)
      : null
    if (!conversation) return { error: "This conversation couldn't be found." }

    // The same window of history the model gets, so what's shown is what it remembers.
    const rows = await readAiTutorMessages(conversation.id, AI_TUTOR_HISTORY_MAX_MESSAGES)
    return { ...conversation, messages: toDisplayMessages(rows) }
  })
