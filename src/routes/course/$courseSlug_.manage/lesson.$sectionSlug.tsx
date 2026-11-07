import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/course/$courseSlug_/manage/lesson/$sectionSlug")({
  component: ManageLessonPage,
})

function ManageLessonPage() {
  const { sectionSlug } = Route.useParams()

  return (
    <div className="mx-auto w-full max-w-3xl space-y-2">
      <h1 className="text-xl font-semibold">Edit Lesson</h1>
      <p className="text-sm text-muted-foreground">
        Editing lesson &quot;{sectionSlug}&quot; is coming soon.
      </p>
    </div>
  )
}
