import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type { ManageAiTutorConversationsPage, ManageAiTutorSearch } from "@/types/ai-tutor"

import { AI_TUTOR_CONVERSATIONS_PER_PAGE } from "../-lib/constants"
import {
  readAiTutorConversationCourses,
  readAiTutorSpendSummary,
  readManagedAiTutorConversations,
  readManagedAiTutorConversationsCount,
} from "../-lib/db.server"

/** The Conversations tab: what the tutor has cost lately, and one page of conversations. */
export const loadManageAiTutorConversations = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator((data: Pick<ManageAiTutorSearch, "q" | "course" | "page">) => data)
  .handler(async ({ data }): Promise<ManageAiTutorConversationsPage> => {
    const filter = { search: data.q.trim(), courseId: data.course }
    const [summary, totalConversations, courses] = await Promise.all([
      readAiTutorSpendSummary(new Date()),
      readManagedAiTutorConversationsCount(filter),
      readAiTutorConversationCourses(),
    ])
    // A stale or hand-edited `?page=` past the end shows the last page rather than an empty one.
    const lastPage = Math.max(1, Math.ceil(totalConversations / AI_TUTOR_CONVERSATIONS_PER_PAGE))
    const page = Math.min(data.page, lastPage)
    const conversations = await readManagedAiTutorConversations(filter, {
      limit: AI_TUTOR_CONVERSATIONS_PER_PAGE,
      offset: (page - 1) * AI_TUTOR_CONVERSATIONS_PER_PAGE,
    })
    return { summary, conversations, totalConversations, courses }
  })
