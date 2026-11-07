import { createFileRoute, notFound } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"

import { EditQuizForm } from "./-components/edit-quiz-form"
import { loadQuizForAdmin } from "./-functions/load-quiz-for-admin"

export const Route = createFileRoute("/(manage)/manage/quizzes/$quizSlug/")({
  loader: async ({ params }) => {
    const quiz = await loadQuizForAdmin({ data: { quizSlug: params.quizSlug } })
    if (!quiz) throw notFound()
    return { quiz }
  },
  pendingComponent: EditQuizPagePending,
  component: EditQuizPage,
})

function EditQuizPage() {
  const { quiz } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      {/* Keyed so the editor's draft state can never carry over to another quiz. */}
      <EditQuizForm key={quiz.id} quiz={quiz} />
    </main>
  )
}

function EditQuizPagePending() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="size-9" />
        </div>
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </main>
  )
}
