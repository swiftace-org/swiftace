import { Link } from "@tanstack/react-router"
import {
  BookOpen,
  CheckCircle2,
  HomeIcon,
  ListChecks,
  LockIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import type { CourseSectionWithDescription } from "@/types/course"

const SECTION_ICONS: Record<string, LucideIcon> = {
  ASSIGNMENT: ListChecks,
  LESSON: BookOpen,
}

const itemClassName = cn(
  "flex items-start gap-3 px-4 py-4 text-left text-sm border-b text-foreground/80",
  "hover:bg-muted/60 transition-colors cursor-pointer",
  "data-[status=active]:bg-muted",
)

/** Only what the sidebar reads — `isOpen` and `isLocked` decide whether the row is a link. */
export type CourseSectionForSidebar = Pick<
  CourseSectionWithDescription,
  "id" | "slug" | "title" | "titlePrefix" | "sectionType" | "isOpen" | "isLocked" | "isCompleted"
>

export function CourseSidebar({
  courseSlug,
  courseTitle,
  sections,
}: {
  courseSlug: string
  courseTitle: string
  sections: CourseSectionForSidebar[]
}) {
  return (
    <nav className="flex flex-col" aria-label="Course contents">
      <Link
        to="/course/$courseSlug"
        params={{ courseSlug }}
        activeOptions={{ exact: true }}
        className={itemClassName}
      >
        <HomeIcon className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden />
        <span className="flex flex-col gap-0.5">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Overview</span>
          <span className="font-medium leading-snug">{courseTitle}</span>
        </span>
      </Link>

      {sections.map((section) => (
        <CourseSectionLink key={section.id} courseSlug={courseSlug} section={section} />
      ))}
    </nav>
  )
}

function CourseSectionLink({
  courseSlug,
  section,
}: {
  courseSlug: string
  section: CourseSectionForSidebar
}) {
  const Icon = SECTION_ICONS[section.sectionType ?? ""] ?? BookOpen
  const isAssignment = section.sectionType === "ASSIGNMENT"
  const content = (
    <>
      <Icon className="mt-0.5 size-4 shrink-0 text-blue-500" aria-hidden />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          {section.titlePrefix?.replace(" -", "") || (isAssignment ? "Assignment" : "Lesson")}
        </span>
        <span className="font-medium leading-snug">{section.title}</span>
      </span>
      {section.isLocked && (
        <LockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      {section.isCompleted && (
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-label="Completed" />
      )}
    </>
  )

  // Listed but not open, or behind the paywall: no link, since the server won't serve the
  // content behind one.
  if (!section.isOpen || section.isLocked) {
    return (
      <span className={cn(itemClassName, "cursor-default text-muted-foreground")}>{content}</span>
    )
  }

  return isAssignment ? (
    <Link
      to="/course/$courseSlug/assignment/$sectionSlug"
      params={{ courseSlug, sectionSlug: section.slug }}
      className={itemClassName}
    >
      {content}
    </Link>
  ) : (
    <Link
      to="/course/$courseSlug/lesson/$sectionSlug"
      params={{ courseSlug, sectionSlug: section.slug }}
      className={itemClassName}
    >
      {content}
    </Link>
  )
}
