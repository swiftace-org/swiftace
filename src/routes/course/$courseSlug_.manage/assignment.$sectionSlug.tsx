import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/course/$courseSlug_/manage/assignment/$sectionSlug")({
  component: ManageAssignmentPage,
})

function ManageAssignmentPage() {
  const { sectionSlug } = Route.useParams()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2">
      <h1 className="text-xl font-semibold">Edit Assignment</h1>
      <p className="text-sm text-muted-foreground">
        Editing assignment &quot;{sectionSlug}&quot; is coming soon.
      </p>
    </div>
  )
}
