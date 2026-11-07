import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"
import { getSiteConfig, readCourseForViewer } from "@/lib/utils.server"
import type { AiTutorConversationSummary, AiTutorUsage } from "@/types/ai-tutor"

import { readAiTutorAccess } from "../-lib/ai-tutor.server"
import { AI_TUTOR_CONVERSATIONS_LIMIT } from "../-lib/constants"
import { readAiTutorConversations } from "../-lib/db.server"

/** What the tutor's panel needs when it opens: the learner's usage and this course's conversations. */
export const loadAiTutorPanel = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((data: { courseSlug: string }) => data)
  .handler(
    async ({
      data,
      context,
    }): Promise<
      { usage: AiTutorUsage; conversations: AiTutorConversationSummary[] } | { error: string }
    > => {
      const viewer = await readCourseForViewer(data.courseSlug)
      if (!viewer) return { error: "This course couldn't be found." }

      const { aiTutor } = await getSiteConfig()
      const [access, conversations] = await Promise.all([
        readAiTutorAccess(context.account, aiTutor, new Date()),
        readAiTutorConversations(
          context.account.id,
          viewer.course.id,
          AI_TUTOR_CONVERSATIONS_LIMIT,
        ),
      ])
      return { usage: access.usage, conversations }
    },
  )
