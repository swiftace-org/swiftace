import { createFileRoute } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminReview } from "@/types/review"

import { ImportReviewsButton } from "./-components/import-reviews-button"
import { ReviewFormDialog } from "./-components/review-form-dialog"
import { ReviewsTable } from "./-components/reviews-table"
import { loadManageReviewsPageData } from "./-functions/load-manage-reviews-page-data"

export const Route = createFileRoute("/(manage)/manage/reviews/")({
  loader: async () => loadManageReviewsPageData(),
  pendingComponent: ManageReviewsPagePending,
  component: ManageReviewsPage,
})

function ManageReviewsPage() {
  const { reviews } = Route.useLoaderData()
  // `undefined` while closed; `null` when adding, since there's no review to edit yet.
  const [editing, setEditing] = useState<AdminReview | null>()

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Manage Reviews</h1>
          <p className="text-sm text-muted-foreground">
            Shown on the landing page in this order. Drag to reorder.
          </p>
        </div>
        <div className="flex gap-2">
          <ImportReviewsButton />
          <Button onClick={() => setEditing(null)}>
            <PlusIcon />
            Add Review
          </Button>
        </div>
      </div>
      <ReviewsTable reviews={reviews} onEdit={setEditing} />
      {editing !== undefined && (
        <ReviewFormDialog
          key={editing?.id ?? "new"}
          review={editing}
          open
          onOpenChange={(open) => !open && setEditing(undefined)}
        />
      )}
    </main>
  )
}

function ManageReviewsPagePending() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Manage Reviews</h1>
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex gap-4 border-b pb-2">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
        </div>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-start gap-4 py-2">
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
            </div>
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        ))}
      </div>
    </main>
  )
}
