import { useRouter } from "@tanstack/react-router"
import { CheckCircle2 } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"

import { submitLessonCompletion } from "../-functions/submit-lesson-completion"
import { SectionCompletedChip } from "../../-components/section-completed-chip"

/**
 * The foot of a lesson: either the tick it already earned, or the button that earns it. A lesson
 * with `require_questions` has neither — its quiz is what completes it, so the Questions tab
 * counts down there instead.
 */
export function LessonCompletion({
  courseSlug,
  sectionSlug,
  isEnrolled,
  isCompleted,
  requireQuestions,
}: {
  courseSlug: string
  sectionSlug: string
  isEnrolled: boolean
  isCompleted: boolean
  requireQuestions: boolean
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

  async function handleComplete() {
    setIsSubmitting(true)
    setError(undefined)

    try {
      const result = await submitLessonCompletion({ data: { courseSlug, sectionSlug } })
      if ("error" in result) {
        setError(result.error)
        return
      }

      toast.add({ type: "success", description: "Lesson marked as completed." })
      await router.invalidate()
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Couldn't save your progress."))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isEnrolled) return null
  if (isCompleted) return <SectionCompletedChip className="border-t pt-4" />
  if (requireQuestions) {
    return (
      <p className="border-t pt-4 text-sm text-muted-foreground">
        Answer all the questions in this lesson to complete it.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <Button
        variant="outline"
        onClick={handleComplete}
        disabled={isSubmitting}
        className="self-start"
      >
        <CheckCircle2 />
        {isSubmitting ? "Saving..." : "Mark as completed"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
