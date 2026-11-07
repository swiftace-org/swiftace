import { createFileRoute, useRouter } from "@tanstack/react-router"
import { CheckCircle2, LockIcon } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import type { QuizGradeResult } from "@/types/quiz"

import { QuizQuestion } from "../-components/quiz-question"
import { fetchQuizForSection } from "../-functions/fetch-quiz-for-section"

export const Route = createFileRoute("/course/$courseSlug/lesson/$sectionSlug/questions")({
  loader: ({ params }) => fetchQuizForSection({ data: params }),
  pendingComponent: LessonQuestionsTabPending,
  component: LessonQuestionsTab,
})

function LessonQuestionsTab() {
  const router = useRouter()
  const quiz = Route.useLoaderData()
  const { courseSlug, sectionSlug } = Route.useParams()

  if (!quiz) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <div className="text-lg">This quiz could not be loaded</div>
      </div>
    )
  }

  if (!quiz.questions.length) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground">
        <div className="text-lg">No questions yet</div>
      </div>
    )
  }

  const solved = new Set(quiz.solvedQuestionIds)

  function handleGraded(result: QuizGradeResult) {
    if (result.completedSection) {
      toast.add({ type: "success", description: "Lesson completed. Nice work!" })
    }
    // Refreshes the solved set and the countdown below, along with the ticks in the sidebar
    // and the course page's progress.
    void router.invalidate()
  }

  return (
    <div className="flex flex-col gap-6">
      {!quiz.canAnswer && (
        <p className="flex items-center gap-2 rounded-md border p-3 text-sm text-muted-foreground">
          <LockIcon className="size-4 shrink-0" aria-hidden />
          Enroll in this course to answer these questions and track your progress.
        </p>
      )}

      {quiz.canAnswer && quiz.requireQuestions && (
        <QuestionsLeft questionsLeft={quiz.questionsLeft} />
      )}

      {quiz.questions.map((question, index) => (
        <QuizQuestion
          key={question.id}
          question={question}
          index={index}
          courseSlug={courseSlug}
          sectionSlug={sectionSlug}
          canAnswer={quiz.canAnswer}
          isSolved={solved.has(question.id)}
          onGraded={handleGraded}
        />
      ))}
    </div>
  )
}

/** Only shown for a `require_questions` lesson, where the count is what completes it. */
function QuestionsLeft({ questionsLeft }: { questionsLeft: number }) {
  if (questionsLeft === 0) {
    return (
      <p className="flex items-center gap-2 rounded-md border p-3 text-sm font-medium">
        <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
        You've answered every question in this lesson.
      </p>
    )
  }

  return (
    <p className="rounded-md border p-3 text-sm text-muted-foreground">
      Answer {questionsLeft} more {questionsLeft === 1 ? "question" : "questions"} correctly to
      complete this lesson.
    </p>
  )
}

function LessonQuestionsTabPending() {
  return (
    <div className="flex flex-col gap-6">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 3 }, (_, j) => (
              <div key={j} className="flex items-center gap-2">
                <Skeleton className="size-4 shrink-0 rounded-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      ))}
    </div>
  )
}
