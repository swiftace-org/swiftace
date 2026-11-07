import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { AdminCourseSummary } from "@/types/course"

import { submitReorderCourses } from "../-functions/submit-reorder-courses"
import { SortableCourseRow } from "./sortable-course-row"

/** Dragging a row sets the order courses are listed in on the home page, sitemap and llms.txt. */
export function CoursesTable({ courses }: { courses: AdminCourseSummary[] }) {
  const router = useRouter()
  const [items, setItems] = useState(courses)
  const [isSaving, setIsSaving] = useState(false)

  // Keep local order in sync with freshly loaded data after invalidation.
  const [syncedCourses, setSyncedCourses] = useState(courses)
  if (courses !== syncedCourses) {
    setSyncedCourses(courses)
    setItems(courses)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((course) => course.id === active.id)
    const newIndex = items.findIndex((course) => course.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered) // optimistic

    setIsSaving(true)
    try {
      const result = await submitReorderCourses({
        data: { courseIds: reordered.map((course) => course.id) },
      })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        setItems(courses) // revert
        return
      }
      toast.add({ type: "success", description: "Order updated!" })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to save the new order."),
      })
      setItems(courses) // revert
    } finally {
      setIsSaving(false)
    }
  }

  if (!courses.length) {
    return <p className="text-sm text-muted-foreground">No courses yet.</p>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8" />
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={items.map((course) => course.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((course) => (
              <SortableCourseRow
                key={course.id}
                course={course}
                dragDisabled={isSaving || items.length <= 1}
              />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  )
}
