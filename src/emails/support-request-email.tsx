import { Heading, Hr, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/emails/email-layout"
import { formatFileSize } from "@/lib/utils"
import type { EmailBrand } from "@/types/site-config"

interface SupportRequestEmailProps {
  brand: EmailBrand
  recipientName: string
  email: string
  subject: string
  message: string
  attachments: { filename: string; size: number }[]
}

/**
 * The learner's own copy, with the support inbox in cc. Deliberately promises no reply — there
 * isn't the bandwidth to answer every message, only to follow up when one needs it.
 */
export default function SupportRequestEmail({
  brand,
  recipientName,
  email,
  subject,
  message,
  attachments,
}: SupportRequestEmailProps) {
  return (
    <EmailLayout brand={brand} preview={`We received your message: ${subject}`}>
      <Heading className="text-2xl text-center font-normal my-6">Message received</Heading>
      <Text className="text-sm my-6">Hi {recipientName},</Text>
      <Text className="text-sm my-6">
        Thanks for writing to the {brand.siteName} team. Here's a copy of your message for your
        records.
      </Text>
      <Section className="my-6">
        <Text className="text-sm font-semibold m-0">{subject}</Text>
        <Section className="bg-gray-100 p-4 mt-2">
          <Text className="text-sm m-0 whitespace-pre-wrap leading-normal">{message}</Text>
        </Section>
      </Section>
      {attachments.length > 0 ? (
        <Section className="my-6">
          <Text className="text-sm font-semibold m-0">Attached files</Text>
          {attachments.map((attachment, index) => (
            // Two attachments can share a name.
            <Text key={`${index}-${attachment.filename}`} className="text-sm my-1">
              {attachment.filename}
              <span className="text-gray-600"> ({formatFileSize(attachment.size)})</span>
            </Text>
          ))}
        </Section>
      ) : null}
      <Hr />
      <Text className="text-xs my-6 text-gray-600 leading-normal">
        Sent by {recipientName} ({email}).
      </Text>
    </EmailLayout>
  )
}

SupportRequestEmail.PreviewProps = {
  brand: { siteName: "Academy", logoUrl: "https://example.com/example_logo.svg" },
  recipientName: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Can't submit my assignment",
  message:
    "When I click Submit on the assignment page nothing happens.\n\nI've tried two browsers.",
  attachments: [{ filename: "screenshot.png", size: 482_133 }],
} satisfies SupportRequestEmailProps
