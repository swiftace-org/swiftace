import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"
import { captureEvent } from "@/lib/utils.server"

import { SUPPORT_MESSAGE_MAX_LENGTH, SUPPORT_SUBJECT_MAX_LENGTH } from "../-lib/constants"
import { toSupportAttachmentError } from "../-lib/utils"
import { sendSupportRequestEmail } from "../-lib/utils.server"

/**
 * Emails the learner a copy of their message, files attached, with the support inbox in cc —
 * that email is the whole record. FormData, because the attachments are files.
 */
export const submitSupportRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: FormData) => {
    if (!(data instanceof FormData)) throw new Error("Invalid support request.")
    return data
  })
  .handler(async ({ data, context }): Promise<{ success: true } | { error: string }> => {
    const subject = readFormText(data, "subject")
    const message = readFormText(data, "message")
    const files = data
      .getAll("attachments")
      .filter((value): value is File => value instanceof File && value.size > 0)

    if (!subject) return { error: "Enter a subject." }
    if (subject.length > SUPPORT_SUBJECT_MAX_LENGTH) {
      return { error: `Keep the subject under ${SUPPORT_SUBJECT_MAX_LENGTH} characters.` }
    }
    if (!message) return { error: "Enter a message." }
    if (message.length > SUPPORT_MESSAGE_MAX_LENGTH) {
      return { error: `Keep the message under ${SUPPORT_MESSAGE_MAX_LENGTH} characters.` }
    }
    const attachmentError = toSupportAttachmentError(files)
    if (attachmentError) return { error: attachmentError }

    const attachments = await Promise.all(
      files.map(async (file) => ({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        content: new Uint8Array(await file.arrayBuffer()),
      })),
    )

    const result = await sendSupportRequestEmail({
      account: context.account,
      subject,
      message,
      attachments,
    })
    if (!result.success) return { error: "Couldn't send your message. Please try again." }

    captureEvent(context.account.id, "support_request_submitted")

    return { success: true }
  })

function readFormText(data: FormData, key: string): string {
  const value = data.get(key)
  return typeof value === "string" ? value.trim() : ""
}
