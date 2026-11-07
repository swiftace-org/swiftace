import { createFileRoute } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"

import { CreateQuizForm } from "./-components/create-quiz-form"
import { QuizzesTable } from "./-components/quizzes-table"
import { loadManageQuizzesPageData } from "./-functions/load-manage-quizzes-page-data"

export const Route = createFileRoute("/(manage)/manage/quizzes/")({
  loader: async () => loadManageQuizzesPageData(),
  pendingComponent: ManageQuizzesPagePending,
  component: ManageQuizzesPage,
})

function ManageQuizzesPage() {
  const { quizzes } = Route.useLoaderData()

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Manage Quizzes</h1>
      <CreateQuizForm />
      <QuizzesTable quizzes={quizzes} />
    </main>
  )
}

function ManageQuizzesPagePending() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold">Manage Quizzes</h1>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-20" />
      </div>
      <div className="space-y-2">
        <div className="flex gap-4 border-b pb-2">
          <Skeleton className="h-4 w-10" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="ml-auto h-8 w-24 rounded-md" />
          </div>
        ))}
      </div>
    </main>
  )
}
