import { createFileRoute, Link } from "@tanstack/react-router"
import {
  BookOpenIcon,
  BotIcon,
  ClipboardCheckIcon,
  ListChecksIcon,
  MessageSquareQuoteIcon,
  SlidersHorizontalIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

import { MetricsSection } from "./-components/metrics-section"
import { RecentActivitySection } from "./-components/recent-activity-section"

export const Route = createFileRoute("/(manage)/manage/")({
  component: ManagePage,
})

const MANAGE_SECTIONS: {
  to:
    | "/manage/courses"
    | "/manage/quizzes"
    | "/manage/evaluate"
    | "/manage/users"
    | "/manage/reviews"
    | "/manage/ai-tutor"
    | "/manage/config"
  title: string
  description: string
  icon: LucideIcon
}[] = [
  {
    to: "/manage/courses",
    title: "Manage Courses",
    description: "Create courses and edit their sections, lessons, and participants.",
    icon: BookOpenIcon,
  },
  {
    to: "/manage/quizzes",
    title: "Manage Quizzes",
    description: "Create quizzes and edit their questions and options.",
    icon: ListChecksIcon,
  },
  {
    to: "/manage/evaluate",
    title: "Manage Evaluations",
    description: "Track every assignment's submissions and evaluate the ones still waiting.",
    icon: ClipboardCheckIcon,
  },
  {
    to: "/manage/users",
    title: "Manage Users",
    description:
      "Search every account and see its enrollments, submissions, payments and activity.",
    icon: UsersIcon,
  },
  {
    to: "/manage/reviews",
    title: "Manage Reviews",
    description: "Import, edit, reorder and set the visibility of the reviews on the landing page.",
    icon: MessageSquareQuoteIcon,
  },
  {
    to: "/manage/ai-tutor",
    title: "Manage AI Tutor",
    description: "Name the course tutor, edit its prompt, and set each plan's model and limits.",
    icon: BotIcon,
  },
  {
    to: "/manage/config",
    title: "Manage Config",
    description: "Set the site's name, contact details, logos and integrations.",
    icon: SlidersHorizontalIcon,
  },
]

function ManagePage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-8 px-4 py-8">
      <h1 className="text-xl font-semibold">Manage</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {MANAGE_SECTIONS.map((section) => (
          <Link key={section.to} to={section.to}>
            <Card className="h-full transition-colors hover:bg-accent">
              <CardHeader>
                <section.icon className="mb-2 size-6 text-muted-foreground" />
                <CardTitle>{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <MetricsSection />
      <RecentActivitySection />
    </main>
  )
}
