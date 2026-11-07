import { Link } from "@tanstack/react-router"
import { BookOpen, ListChecks, type LucideIcon } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSiteConfig } from "@/lib/hooks"
import type { CourseDisplay } from "@/types/course"

export function CourseCard({
  course,
  lessonCount,
  assignmentCount,
  loading = "eager",
}: {
  course: CourseDisplay
  lessonCount?: number
  assignmentCount?: number
  /** `lazy` for cards below the fold, which also keeps React from preloading their covers. */
  loading?: "eager" | "lazy"
}) {
  const { slug, title, shortDescription, cover, isPaid } = course

  const { branding } = useSiteConfig()
  const courseCover = cover || branding.courseCoverUrl
  const hasPaidAccess = Boolean(isPaid)
  const stats = [
    {
      label: lessonCount ? `${lessonCount} lessons` : null,
      icon: BookOpen,
    },
    {
      label: assignmentCount ? `${assignmentCount} assignments` : null,
      icon: ListChecks,
    },
  ].filter((stat): stat is { label: string; icon: LucideIcon } => Boolean(stat.label))

  return (
    <Card className="h-full overflow-hidden border-border/70 pb-6 pt-0 shadow-none">
      <Link
        to="/course/$courseSlug"
        params={{ courseSlug: slug }}
        className="relative block aspect-video w-full overflow-hidden rounded-t-xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {!hasPaidAccess && (
          <div className="absolute right-4 top-4 z-10">
            <Badge variant="secondary">Free</Badge>
          </div>
        )}
        <img
          alt={`${title} cover`}
          title={title}
          className="object-cover"
          src={courseCover}
          loading={loading}
        />
      </Link>
      <CardHeader className="space-y-2">
        <CardTitle className="text-2xl">
          <BlueLink to="/course/$courseSlug" params={{ courseSlug: slug }}>
            {title}
          </BlueLink>
        </CardTitle>
        {!!shortDescription && (
          <CardDescription className="text-base leading-relaxed">
            {shortDescription}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <ul className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          {stats.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-1">
              <Icon className="h-4 w-4 text-foreground/70" aria-hidden />
              <span>{label}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
