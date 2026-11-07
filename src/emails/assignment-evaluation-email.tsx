import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/emails/email-layout"
import type { EvaluationDecision } from "@/types/evaluation"
import type { EmailBrand } from "@/types/site-config"

interface AssignmentEvaluationEmailProps {
  brand: EmailBrand
  recipientName: string
  status: Extract<EvaluationDecision, "PASS" | "FAIL">
  assignmentTitle: string
  assignmentUrl: string
  courseTitle: string
  courseUrl: string
  submissionId: number
  comments: string | null
}

export default function AssignmentEvaluationEmail({
  brand,
  recipientName,
  status,
  assignmentTitle,
  assignmentUrl,
  courseTitle,
  courseUrl,
  submissionId,
  comments,
}: AssignmentEvaluationEmailProps) {
  const passed = status === "PASS"

  return (
    <EmailLayout brand={brand} preview={`Your submission for ${assignmentTitle} has been graded`}>
      <Heading className="text-2xl text-center font-normal my-6">
        {passed ? "Your submission passed" : "Your submission needs changes"}
      </Heading>
      <Text className="text-sm my-6">Hi {recipientName},</Text>
      <Text className="text-sm my-6">
        {"You received a "}
        <span className="font-bold">{passed ? "Pass" : "Fail"}</span>
        {" grade for your submission to "}
        <Link href={assignmentUrl} className="text-blue-600 no-underline">
          {assignmentTitle}
        </Link>
        {" in "}
        <Link href={courseUrl} className="text-blue-600 no-underline">
          {courseTitle}
        </Link>
        {passed ? ". Well done!" : "."}
      </Text>
      {comments ? (
        <Section className="my-6">
          <Text className="text-sm font-semibold m-0">Evaluation comments</Text>
          <Section className="bg-gray-100 p-4 mt-2">
            <Text className="text-sm m-0 whitespace-pre-wrap leading-normal">{comments}</Text>
          </Section>
        </Section>
      ) : null}
      {passed ? null : (
        <Text className="text-sm my-6">
          Fix the issues above and submit again — only your latest submission is graded. Re-read the
          submission guidelines on the assignment page before you resubmit.
        </Text>
      )}
      <Section className="my-6 text-center">
        <Button
          href={assignmentUrl}
          className="bg-blue-600 text-white text-sm font-medium rounded px-4 py-3 no-underline"
        >
          View assignment
        </Button>
      </Section>
      <Hr />
      <Text className="text-xs my-6 text-gray-600 leading-normal">
        Submission ID {submissionId}.
      </Text>
    </EmailLayout>
  )
}

AssignmentEvaluationEmail.PreviewProps = {
  brand: { siteName: "Academy", logoUrl: "https://example.com/example_logo.svg" },
  recipientName: "Ada Lovelace",
  status: "FAIL",
  assignmentTitle: "Assignment 1 - Pytorch Basics",
  assignmentUrl: "https://example.com/course/example-course/assignment/assignment-1",
  courseTitle: "Deep Learning with PyTorch: Zero to GANs",
  courseUrl: "https://example.com/course/example-course",
  submissionId: 123456,
  comments: "The notebook does not run end to end — cell 12 raises a NameError.",
} satisfies AssignmentEvaluationEmailProps
