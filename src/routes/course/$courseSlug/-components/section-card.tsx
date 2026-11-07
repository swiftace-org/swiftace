import { BookOpen, CheckCircle2, ListChecks, LockIcon, type LucideIcon } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { Markdown } from "@/components/markdown"
import { Badge } from "@/components/ui/badge"
import type { CourseSectionWithDescription } from "@/types/course"

import { SectionIcon } from "./section-icon"

const SECTION_ICONS: Record<string, LucideIcon> = {
  ASSIGNMENT: ListChecks,
  LESSON: BookOpen,
}

export function SectionCard({
  section,
  courseSlug,
}: {
  section: CourseSectionWithDescription
  courseSlug: string
}) {
  const Icon = SECTION_ICONS[section.sectionType ?? ""] ?? BookOpen
  const isAssignment = section.sectionType === "ASSIGNMENT"
  const label = section.titlePrefix?.replace(" -", "") || (isAssignment ? "Assignment" : "Lesson")
  const canOpen = section.isOpen && !section.isLocked

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row">
      <SectionIcon Icon={Icon} />
      <div className="flex flex-col gap-1">
        <span className="text-sm uppercase tracking-wide text-muted-foreground">{label}</span>
        <div className="flex flex-wrap items-center gap-2">
          {/* A section that isn't open — or is behind the paywall — is still listed, just not
              linked: the server refuses its content either way. */}
          {canOpen ? (
            <BlueLink
              to={
                isAssignment
                  ? "/course/$courseSlug/assignment/$sectionSlug"
                  : "/course/$courseSlug/lesson/$sectionSlug"
              }
              params={{ courseSlug, sectionSlug: section.slug }}
              className="text-xl font-medium leading-snug"
            >
              {section.title}
            </BlueLink>
          ) : (
            <span className="text-xl font-medium leading-snug text-muted-foreground">
              {section.title}
            </span>
          )}
          {section.isPreview && <Badge variant="outline">Preview</Badge>}
          {section.isLocked && (
            <LockIcon className="size-4 text-muted-foreground" aria-label="Enroll to unlock" />
          )}
          {section.isCompleted && (
            <CheckCircle2 className="size-4 text-primary" aria-label="Completed" />
          )}
          {section.isOptional && (
            <span className="text-sm italic text-muted-foreground">optional</span>
          )}
        </div>
        {section.shortDescriptionHtml && <Markdown markup={section.shortDescriptionHtml} />}
      </div>
    </div>
  )
}
