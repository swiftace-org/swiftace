import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { ExternalLink, Eye, EyeOff, GripVertical, Pencil, Trash2 } from "lucide-react"

import { IconButton } from "@/components/icon-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TableCell, TableRow } from "@/components/ui/table"
import { cn, getInitials } from "@/lib/utils"
import type { AdminReview } from "@/types/review"

import { REVIEW_VISIBILITY_LABELS } from "../-lib/constants"

export function SortableReviewRow({
  review,
  dragDisabled,
  onEdit,
  onToggleVisibility,
  onDelete,
}: {
  review: AdminReview
  dragDisabled: boolean
  onEdit: (review: AdminReview) => void
  onToggleVisibility: (review: AdminReview) => void
  onDelete: (review: AdminReview) => void
}) {
  const isPublic = review.visibility === "PUBLIC"
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: review.id,
    disabled: dragDisabled,
  })

  return (
    <TableRow
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn("hover:bg-transparent", isDragging && "relative z-10 bg-muted shadow-sm")}
    >
      <TableCell className="w-8 align-top">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Drag to reorder the review from ${review.name}`}
          disabled={dragDisabled}
          className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical />
        </Button>
      </TableCell>
      <TableCell className="whitespace-normal align-top">
        <div className={cn("flex gap-3", !isPublic && "opacity-60")}>
          <Avatar className="mt-0.5">
            {review.avatarUrl && <AvatarImage src={review.avatarUrl} alt="" />}
            <AvatarFallback className="text-xs">{getInitials(review.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <span className="font-medium">{review.name}</span>
            {review.headline && <p className="text-xs text-muted-foreground">{review.headline}</p>}
            <p className="line-clamp-2 text-muted-foreground">{review.body}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Badge variant={isPublic ? "default" : "outline"}>
          {REVIEW_VISIBILITY_LABELS[review.visibility] ?? review.visibility}
        </Badge>
      </TableCell>
      <TableCell className="align-top">
        <div className="flex justify-end gap-1">
          {review.sourceUrl && (
            <IconButton
              tooltip="Open source"
              render={
                <a
                  href={review.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open the review from ${review.name} where it was posted`}
                />
              }
              nativeButton={false}
            >
              <ExternalLink />
            </IconButton>
          )}
          <IconButton tooltip="Edit" onClick={() => onEdit(review)}>
            <Pencil />
          </IconButton>
          <IconButton
            tooltip={isPublic ? "Make private" : "Make public"}
            onClick={() => onToggleVisibility(review)}
          >
            {isPublic ? <EyeOff /> : <Eye />}
          </IconButton>
          <IconButton tooltip="Delete" onClick={() => onDelete(review)}>
            <Trash2 />
          </IconButton>
        </div>
      </TableCell>
    </TableRow>
  )
}
