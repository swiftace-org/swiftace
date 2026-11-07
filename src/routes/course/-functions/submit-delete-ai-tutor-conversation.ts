import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"

import { softDeleteAiTutorConversation } from "../-lib/db.server"

/** Removes a conversation from the learner's history. Admins still see it, marked as deleted. */
export const submitDeleteAiTutorConversation = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { conversationId: number }) => data)
  .handler(async ({ data, context }): Promise<{ success: true } | { error: string }> => {
    try {
      const deleted = await softDeleteAiTutorConversation(data.conversationId, context.account.id)
      return deleted ? { success: true } : { error: "This conversation couldn't be found." }
    } catch (error) {
      console.error("submitDeleteAiTutorConversation: failed", data.conversationId, error)
      return { error: "Couldn't delete this conversation. Please try again." }
    }
  })
