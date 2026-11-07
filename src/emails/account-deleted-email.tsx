import { Heading, Hr, Text } from "@react-email/components"

import { EmailLayout } from "@/emails/email-layout"
import type { EmailBrand } from "@/types/site-config"

interface AccountDeletedEmailProps {
  brand: EmailBrand
  recipientName: string
  email: string
}

/** Sent after the fact, with the support inbox in cc, so there's a record of when it happened. */
export default function AccountDeletedEmail({
  brand,
  recipientName,
  email,
}: AccountDeletedEmailProps) {
  return (
    <EmailLayout brand={brand} preview={`Your ${brand.siteName} account has been deleted`}>
      <Heading className="text-2xl text-center font-normal my-6">
        Your account has been deleted
      </Heading>
      <Text className="text-sm my-6">Hi {recipientName},</Text>
      <Text className="text-sm my-6">
        The {brand.siteName} account for {email} has been permanently deleted, along with your
        course enrollments, progress, assignment submissions, quiz answers, certificates and
        notebooks.
      </Text>
      <Text className="text-sm my-6">
        You can sign up again with the same email address at any time, but none of your earlier
        progress can be restored.
      </Text>
      <Hr />
      <Text className="text-xs my-6 text-gray-600 leading-normal">
        If you didn't ask for this, or have any questions, just reply to this email.
      </Text>
    </EmailLayout>
  )
}

AccountDeletedEmail.PreviewProps = {
  brand: { siteName: "Academy", logoUrl: "https://example.com/example_logo.svg" },
  recipientName: "Ada Lovelace",
  email: "ada@example.com",
} satisfies AccountDeletedEmailProps
