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
import type { AdminCourseSectionSummary } from "@/types/course"

import { submitDeleteCourseSection } from "../-functions/delete-course-section"
import { submitReorderCourseSections } from "../-functions/reorder-course-sections"
import { SortableSectionRow } from "./sortable-section-row"

export function CourseSectionsTable({
  courseSlug,
  sections,
}: {
  courseSlug: string
  sections: AdminCourseSectionSummary[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(sections)
  const [isSaving, setIsSaving] = useState(false)

  // Keep local order in sync with freshly loaded data after invalidation.
  const [syncedSections, setSyncedSections] = useState(sections)
  if (sections !== syncedSections) {
    setSyncedSections(sections)
    setItems(sections)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((section) => section.id === active.id)
    const newIndex = items.findIndex((section) => section.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered) // optimistic

    setIsSaving(true)
    try {
      const result = await submitReorderCourseSections({
        data: { courseSlug, sectionSlugs: reordered.map((section) => section.slug) },
      })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        setItems(sections) // revert
        return
      }
      toast.add({ type: "success", description: "Order updated!" })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to save the new order."),
      })
      setItems(sections) // revert
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(section: AdminCourseSectionSummary) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${section.title}"? This action can't be undone.`,
    )
    if (!confirmed) return

    try {
      const result = await submitDeleteCourseSection({
        data: { courseSlug, sectionSlug: section.slug },
      })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        return
      }
      toast.add({ type: "success", description: `Section - ${section.title} removed!` })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to delete the section."),
      })
    }
  }

  if (!sections.length) {
    return <p className="text-sm text-muted-foreground">No sections yet. Add one above.</p>
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
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={items.map((section) => section.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((section) => (
              <SortableSectionRow
                key={section.id}
                section={section}
                courseSlug={courseSlug}
                dragDisabled={isSaving || items.length <= 1}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  )
}
