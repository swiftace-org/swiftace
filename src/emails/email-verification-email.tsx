import { Heading, Hr, Link, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/emails/email-layout"
import type { EmailBrand } from "@/types/site-config"

interface EmailVerificationEmailProps {
  brand: EmailBrand
  verificationCode: string
  verificationUrl: string
  email: string
  expiryMinutes: number
}

export default function EmailVerificationEmail({
  brand,
  verificationCode,
  verificationUrl,
  email,
  expiryMinutes,
}: EmailVerificationEmailProps) {
  return (
    <EmailLayout brand={brand} preview={`Verify your email on ${brand.siteName}`}>
      <Heading className="text-2xl text-center font-normal my-6">
        {"Verify your email on "}
        <span className="font-bold">{brand.siteName}</span>
      </Heading>
      <Text className="text-sm my-6">
        Enter the following verification code to log in to your account:
      </Text>
      <Section className="bg-gray-100 p-4 my-6 text-center">
        <Text className="text-4xl font-bold m-0 tracking-wider font-mono leading-none">
          {verificationCode}
        </Text>
      </Section>
      <Section className="my-6">
        <Text className="text-sm m-0">or copy and paste this URL into your browser:</Text>
        <Link href={verificationUrl} className="text-blue-600 no-underline text-sm m-0">
          {verificationUrl}
        </Link>
      </Section>
      <Hr />
      <Text className="text-xs my-6 text-gray-600 leading-normal">
        This code was sent to <span className="font-semibold">{email}</span>. If you did not request
        this code, you can safely ignore this email. The code will expire in {expiryMinutes}{" "}
        minutes.
      </Text>
    </EmailLayout>
  )
}

EmailVerificationEmail.PreviewProps = {
  verificationCode: "586435",
  verificationUrl: "https://example.com/login/verify?token=sdfsfsdfsfsdf",
  email: "test@example.com",
  brand: { siteName: "Academy", logoUrl: "https://example.com/example_logo.svg" },
  expiryMinutes: 10,
} satisfies EmailVerificationEmailProps
