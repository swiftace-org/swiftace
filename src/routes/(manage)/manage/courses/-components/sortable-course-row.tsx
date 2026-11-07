import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Link } from "@tanstack/react-router"
import { GripVertical, Pencil } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { IconButton } from "@/components/icon-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { DEFAULT_COURSE_VISIBILITY } from "@/lib/config"
import { cn } from "@/lib/utils"
import type { AdminCourseSummary } from "@/types/course"

export function SortableCourseRow({
  course,
  dragDisabled,
}: {
  course: AdminCourseSummary
  dragDisabled: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: course.id,
    disabled: dragDisabled,
  })

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
          aria-label={`Drag to reorder ${course.title}`}
          disabled={dragDisabled}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical />
        </Button>
      </TableCell>
      <TableCell className="text-muted-foreground">{course.id}</TableCell>
      <TableCell>
        <BlueLink to="/course/$courseSlug" params={{ courseSlug: course.slug }}>
          {course.title}
        </BlueLink>
      </TableCell>
      <TableCell>
        <Badge variant={course.visibility === "PUBLIC" ? "default" : "outline"}>
          {course.visibility ?? DEFAULT_COURSE_VISIBILITY}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <IconButton
          tooltip="Edit course"
          render={
            <Link
              to="/course/$courseSlug/manage"
              params={{ courseSlug: course.slug }}
              aria-label={`Edit ${course.title}`}
            />
          }
          nativeButton={false}
        >
          <Pencil />
        </IconButton>
      </TableCell>
    </TableRow>
  )
}
