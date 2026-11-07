import { Button, Heading, Hr, Link, Section, Text } from "@react-email/components"

import { EmailLayout } from "@/emails/email-layout"
import type { EmailBrand } from "@/types/site-config"
import type { SubscriptionInterval } from "@/types/subscription"

interface TrialStartedEmailProps {
  brand: EmailBrand
  recipientName: string
  planName: string
  trialDays: number
  trialEndDate: string | null
  /** The billing schedule they picked; null for a price this app doesn't sell. */
  interval: SubscriptionInterval | null
  /** What the first invoice after the trial comes to, formatted, e.g. `$99`. */
  firstCharge: string | null
  benefits: string[]
  coursesUrl: string
  settingsUrl: string
}

export default function TrialStartedEmail({
  brand,
  recipientName,
  planName,
  trialDays,
  trialEndDate,
  interval,
  firstCharge,
  benefits,
  coursesUrl,
  settingsUrl,
}: TrialStartedEmailProps) {
  const schedule = interval ? INTERVAL_SCHEDULES[interval] : null

  return (
    <EmailLayout brand={brand} preview={`Your ${trialDays}-day ${planName} trial has started`}>
      <Heading className="text-2xl text-center font-normal my-6">Welcome to {planName}</Heading>
      <Text className="text-sm my-6">Hi {recipientName},</Text>
      <Text className="text-sm my-6">
        Your {trialDays}-day free trial of {planName} has started.
      </Text>
      <Section className="bg-gray-100 px-4 py-2 my-6">
        <SummaryRow
          label="Plan"
          value={schedule ? `${planName}, billed ${schedule.adverb}` : planName}
        />
        {trialEndDate && <SummaryRow label="Free until" value={trialEndDate} />}
        {firstCharge && (
          <SummaryRow
            label="Then"
            value={
              schedule
                ? `${firstCharge} per ${schedule.unit}${trialEndDate ? `, starting ${trialEndDate}` : ""}`
                : `${firstCharge}${trialEndDate ? ` on ${trialEndDate}` : ""}`
            }
          />
        )}
      </Section>
      <Text className="text-sm my-6">Here's everything you now have access to:</Text>
      <Section className="my-6">
        {benefits.map((benefit) => (
          <Text key={benefit} className="text-sm my-1">
            ✓ {benefit}
          </Text>
        ))}
      </Section>
      <Text className="text-sm my-6">
        The best way to make the most of your trial is to pick a course and start today. Even 30
        minutes a day adds up quickly — and every quiz, assignment and project you complete brings
        you closer to a certificate you can share.
      </Text>
      <Section className="my-6 text-center">
        <Button
          href={coursesUrl}
          className="bg-blue-600 text-white text-sm font-medium rounded px-4 py-3 no-underline"
        >
          Start learning
        </Button>
      </Section>
      <Hr />
      <Text className="text-xs my-6 text-gray-600 leading-normal">
        {toRenewalNotice({ trialEndDate, firstCharge, schedule })}
        {firstCharge ? " Cancel before then from your " : " You can cancel anytime from your "}
        <Link href={settingsUrl} className="text-blue-600 no-underline">
          settings
        </Link>
        {firstCharge ? " and you won't be charged." : "."}
      </Text>
    </EmailLayout>
  )
}

const INTERVAL_SCHEDULES: Record<SubscriptionInterval, { adverb: string; unit: string }> = {
  month: { adverb: "monthly", unit: "month" },
  year: { adverb: "yearly", unit: "year" },
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Text className="text-sm my-2">
      <span className="text-gray-600">{label}: </span>
      <span className="font-semibold">{value}</span>
    </Text>
  )
}

/** Spells out the first charge, since the card on file is billed with no further step. */
function toRenewalNotice({
  trialEndDate,
  firstCharge,
  schedule,
}: {
  trialEndDate: string | null
  firstCharge: string | null
  schedule: { unit: string } | null
}): string {
  const when = trialEndDate ? `on ${trialEndDate}` : "when the trial ends"
  if (!firstCharge) return `Your subscription renews automatically ${when}.`
  const repeat = schedule ? `, and then every ${schedule.unit}` : ""
  return `Your card will be charged ${firstCharge} ${when}${repeat}.`
}

TrialStartedEmail.PreviewProps = {
  brand: { siteName: "Academy", logoUrl: "https://example.com/example_logo.svg" },
  recipientName: "Ada Lovelace",
  planName: "Academy Pro",
  trialDays: 7,
  trialEndDate: "October 17, 2026",
  interval: "year",
  firstCharge: "$99",
  benefits: [
    "Unlimited access to every course",
    "Quizzes to put your skills to the test",
    "Hands-on assignments and projects",
    "Personal feedback on your work",
    "Verified certificates to showcase your skills",
  ],
  coursesUrl: "https://example.com/#courses",
  settingsUrl: "https://example.com/settings",
} satisfies TrialStartedEmailProps
