import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { ManagedUserOverview } from "@/types/user"

import { formatMinorAmount } from "../-lib/utils"
import { PAYMENT_STATUS_SUCCEEDED } from "../../-lib/constants"

/** The headline numbers, so an admin can size someone up before opening a tab. */
export function UserStats({ overview }: { overview: ManagedUserOverview }) {
  const { enrollments, submissions, quizzes, payments } = overview

  const passedAssignments = new Set(
    submissions
      .filter((submission) => submission.status === "PASS")
      .map((submission) => `${submission.courseSlug}/${submission.assignmentSlug}`),
  ).size
  const answered = quizzes.reduce((total, quiz) => total + quiz.answered, 0)
  const correct = quizzes.reduce((total, quiz) => total + quiz.correct, 0)

  const paidByCurrency = new Map<string, number>()
  for (const payment of payments) {
    if (payment.kind !== "course" || payment.status !== PAYMENT_STATUS_SUCCEEDED) continue
    const currency = payment.currency ?? "usd"
    paidByCurrency.set(currency, (paidByCurrency.get(currency) ?? 0) + (payment.amount ?? 0))
  }

  const stats = [
    { label: "Courses", value: enrollments.length.toLocaleString("en-US") },
    {
      label: "Certificates",
      value: enrollments
        .filter((enrollment) => enrollment.certificateSlug)
        .length.toLocaleString("en-US"),
    },
    {
      label: "Lessons done",
      value: enrollments
        .reduce((total, enrollment) => total + enrollment.completedLessons, 0)
        .toLocaleString("en-US"),
    },
    {
      label: "Assignments passed",
      value: passedAssignments.toLocaleString("en-US"),
      hint: `${submissions.length.toLocaleString("en-US")} submissions`,
    },
    {
      label: "Quiz answers",
      value: answered.toLocaleString("en-US"),
      hint: answered ? `${Math.round((correct / answered) * 100)}% correct` : undefined,
    },
    { label: "Notebooks", value: overview.totalNotebooks.toLocaleString("en-US") },
    {
      label: "Paid",
      value: paidByCurrency.size
        ? [...paidByCurrency]
            .map(([currency, amount]) => formatMinorAmount(amount, currency))
            .join(" + ")
        : "—",
    },
    ...(overview.evaluationsGiven
      ? [{ label: "Evaluations given", value: overview.evaluationsGiven.toLocaleString("en-US") }]
      : []),
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
      {stats.map((stat) => (
        <Card key={stat.label} size="sm" className="gap-1">
          <CardHeader className="gap-1">
            <CardDescription className="text-xs">{stat.label}</CardDescription>
            <CardTitle className="text-xl tabular-nums">{stat.value}</CardTitle>
            {stat.hint ? <p className="text-xs text-muted-foreground">{stat.hint}</p> : null}
          </CardHeader>
        </Card>
      ))}
    </div>
  )
}
