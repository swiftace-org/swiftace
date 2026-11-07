import AssignmentEvaluationEmail from "@/emails/assignment-evaluation-email"
import { getSiteUrl, readEmailBrand, sendSesEmail } from "@/lib/utils.server"

export async function sendAssignmentEvaluationEmail({
  email,
  recipientName,
  status,
  courseSlug,
  courseTitle,
  sectionSlug,
  assignmentTitle,
  submissionId,
  comments,
}: {
  email: string
  recipientName: string
  status: "PASS" | "FAIL"
  courseSlug: string
  courseTitle: string
  sectionSlug: string
  assignmentTitle: string
  submissionId: number
  comments: string | null
}): Promise<{ success: true } | { success: false; error: unknown }> {
  const siteUrl = getSiteUrl()
  const courseUrl = `${siteUrl}/course/${courseSlug}`

  return sendSesEmail({
    to: email,
    subject: `Evaluation result for ${assignmentTitle} — ${courseTitle}`,
    reactBody: AssignmentEvaluationEmail({
      brand: await readEmailBrand(),
      recipientName,
      status,
      assignmentTitle,
      assignmentUrl: `${courseUrl}/assignment/${sectionSlug}`,
      courseTitle,
      courseUrl,
      submissionId,
      comments,
    }),
  })
}
