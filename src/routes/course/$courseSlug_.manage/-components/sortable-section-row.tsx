import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Link } from "@tanstack/react-router"
import { Eye, GripVertical, ListChecks, Pencil, Trash2 } from "lucide-react"

import { IconButton } from "@/components/icon-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { AdminCourseSectionSummary } from "@/types/course"

import { DEFAULT_COURSE_SECTION_VISIBILITY } from "../../-lib/constants"

export function SortableSectionRow({
  section,
  courseSlug,
  dragDisabled,
  onDelete,
}: {
  section: AdminCourseSectionSummary
  courseSlug: string
  dragDisabled: boolean
  onDelete: (section: AdminCourseSectionSummary) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: dragDisabled,
  })
  const isAssignment = section.sectionType === "ASSIGNMENT"

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("hover:bg-transparent", isDragging && "relative z-10 bg-muted shadow-sm")}
    >
      <TableCell className="w-8">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Drag to reorder ${section.title}`}
          disabled={dragDisabled}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical />
        </Button>
      </TableCell>
      <TableCell>{section.title}</TableCell>
      <TableCell className="text-muted-foreground capitalize">
        {section.sectionType?.toLowerCase()}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Badge variant={section.visibility === "VISIBLE" ? "default" : "outline"}>
            {section.visibility ?? DEFAULT_COURSE_SECTION_VISIBILITY}
          </Badge>
          {/* `always_open` only does anything on a paid course, but it's set per section. */}
          {section.alwaysOpen && <Badge variant="outline">Preview</Badge>}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex justify-end gap-1">
          {isAssignment ? (
            <IconButton
              tooltip="Evaluate submissions"
              render={
                <Link
                  to="/course/$courseSlug/manage/evaluate/$sectionSlug"
                  params={{ courseSlug, sectionSlug: section.slug }}
                  aria-label={`Evaluate ${section.title}`}
                />
              }
              nativeButton={false}
            >
              <ListChecks />
            </IconButton>
          ) : null}
          <IconButton
            tooltip="Edit"
            render={
              <Link
                to={
                  isAssignment
                    ? "/course/$courseSlug/manage/assignment/$sectionSlug"
                    : "/course/$courseSlug/manage/lesson/$sectionSlug"
                }
                params={{ courseSlug, sectionSlug: section.slug }}
                aria-label={`Edit ${section.title}`}
              />
            }
            nativeButton={false}
          >
            <Pencil />
          </IconButton>
          <IconButton
            tooltip="View"
            render={
              <Link
                to={
                  isAssignment
                    ? "/course/$courseSlug/assignment/$sectionSlug"
                    : "/course/$courseSlug/lesson/$sectionSlug"
                }
                params={{ courseSlug, sectionSlug: section.slug }}
                aria-label={`View ${section.title}`}
              />
            }
            nativeButton={false}
          >
            <Eye />
          </IconButton>
          <IconButton tooltip="Delete" onClick={() => onDelete(section)}>
            <Trash2 />
          </IconButton>
        </div>
      </TableCell>
    </TableRow>
  )
}
