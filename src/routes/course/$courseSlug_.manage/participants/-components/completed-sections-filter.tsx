import { ListChecks } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { AdminCourseSectionSummary } from "@/types/course"

import { COURSE_SECTION_TYPE_LABELS } from "../../-lib/constants"

/** Narrows the table to participants who have completed *every* section ticked here. */
export function CompletedSectionsFilter({
  sections,
  selected,
  onChange,
}: {
  sections: AdminCourseSectionSummary[]
  selected: string[]
  onChange: (slugs: string[]) => void
}) {
  if (!sections.length) return null

  const selectedSlugs = new Set(selected)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" className="w-full justify-between lg:w-56" />}
      >
        <ListChecks />
        <span className="truncate">
          {selected.length ? `Completed (${selected.length})` : "Completed sections"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-80 w-72 overflow-y-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Completed all of</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {sections.map((section) => (
            <DropdownMenuCheckboxItem
              key={section.slug}
              checked={selectedSlugs.has(section.slug)}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? [...selected, section.slug]
                    : selected.filter((slug) => slug !== section.slug),
                )
              }
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{section.title}</span>
                <span className="text-xs text-muted-foreground">
                  {section.sectionType === "ASSIGNMENT"
                    ? COURSE_SECTION_TYPE_LABELS.ASSIGNMENT
                    : COURSE_SECTION_TYPE_LABELS.LESSON}
                </span>
              </span>
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
        {selected.length ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onChange([])}>Clear sections</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
