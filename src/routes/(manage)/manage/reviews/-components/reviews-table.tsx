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
import type { AdminReview } from "@/types/review"

import { submitDeleteReview } from "../-functions/delete-review"
import { submitReorderReviews } from "../-functions/reorder-reviews"
import { submitUpdateReviewVisibility } from "../-functions/submit-update-review-visibility"
import { REVIEW_CSV_COLUMNS } from "../-lib/constants"
import { SortableReviewRow } from "./sortable-review-row"

export function ReviewsTable({
  reviews,
  onEdit,
}: {
  reviews: AdminReview[]
  onEdit: (review: AdminReview) => void
}) {
  const router = useRouter()
  const [items, setItems] = useState(reviews)
  const [isSaving, setIsSaving] = useState(false)

  // Keep local order in sync with freshly loaded data after invalidation.
  const [syncedReviews, setSyncedReviews] = useState(reviews)
  if (reviews !== syncedReviews) {
    setSyncedReviews(reviews)
    setItems(reviews)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((review) => review.id === active.id)
    const newIndex = items.findIndex((review) => review.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(items, oldIndex, newIndex)
    setItems(reordered) // optimistic

    setIsSaving(true)
    try {
      const result = await submitReorderReviews({
        data: { reviewIds: reordered.map((review) => review.id) },
      })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        setItems(reviews) // revert
        return
      }
      toast.add({ type: "success", description: "Order updated!" })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to save the new order."),
      })
      setItems(reviews) // revert
    } finally {
      setIsSaving(false)
    }
  }

  async function handleToggleVisibility(review: AdminReview) {
    const visibility = review.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC"
    try {
      const result = await submitUpdateReviewVisibility({
        data: { reviewId: review.id, visibility },
      })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        return
      }
      toast.add({
        type: "success",
        description: `Review from ${review.name} is now ${visibility.toLowerCase()}.`,
      })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to update the review."),
      })
    }
  }

  async function handleDelete(review: AdminReview) {
    const confirmed = window.confirm(
      `Are you sure you want to delete the review from ${review.name}? This action can't be undone.`,
    )
    if (!confirmed) return

    try {
      const result = await submitDeleteReview({ data: { reviewId: review.id } })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        return
      }
      toast.add({ type: "success", description: `Review from ${review.name} deleted.` })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to delete the review."),
      })
    }
  }

  if (!reviews.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No reviews yet. Add one, or import a CSV with {REVIEW_CSV_COLUMNS.join(", ")} columns.
      </p>
    )
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
            <TableHead>Review</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <SortableContext
            items={items.map((review) => review.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((review) => (
              <SortableReviewRow
                key={review.id}
                review={review}
                dragDisabled={isSaving || items.length <= 1}
                onEdit={onEdit}
                onToggleVisibility={handleToggleVisibility}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </TableBody>
      </Table>
    </DndContext>
  )
}
