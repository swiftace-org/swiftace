import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/emails/email-layout"
import type { EmailBrand } from "@/types/site-config"

interface CourseCertificateEmailProps {
  brand: EmailBrand
  recipientName: string
  courseTitle: string
  courseUrl: string
  certificateUrl: string
}

export default function CourseCertificateEmail({
  brand,
  recipientName,
  courseTitle,
  courseUrl,
  certificateUrl,
}: CourseCertificateEmailProps) {
  return (
    <EmailLayout brand={brand} preview={`Your certificate for ${courseTitle} is ready`}>
      <Heading className="text-2xl text-center font-normal my-6">Your certificate is ready</Heading>
      <Text className="text-sm my-6">Hi {recipientName},</Text>
      <Text className="text-sm my-6">
        {"Your certificate for "}
        <Link href={courseUrl} className="text-blue-600 no-underline">
          {courseTitle}
        </Link>
        {" has been issued. Congratulations!"}
      </Text>
      <Section className="my-6 text-center">
        <Button
          href={certificateUrl}
          className="bg-blue-600 text-white text-sm font-medium rounded px-4 py-3 no-underline"
        >
          View certificate
        </Button>
      </Section>
      <Hr />
      <Text className="text-xs my-6 text-gray-600 leading-normal">
        {"You can download the PDF, or share this link to let anyone verify it: "}
        <Link href={certificateUrl} className="text-blue-600 no-underline">
          {certificateUrl}
        </Link>
      </Text>
    </EmailLayout>
  )
}

CourseCertificateEmail.PreviewProps = {
  brand: { siteName: "Academy", logoUrl: "https://example.com/example_logo.svg" },
  recipientName: "Ada Lovelace",
  courseTitle: "Data Analysis with Python: Zero to Pandas",
  courseUrl: "https://example.com/course/example-course",
  certificateUrl: "https://example.com/certificate/GEZDGNBVGY3TQ",
} satisfies CourseCertificateEmailProps
