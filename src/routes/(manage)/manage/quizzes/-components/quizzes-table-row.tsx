import { Link, useRouter } from "@tanstack/react-router"
import { ExternalLink, Pencil, Trash2 } from "lucide-react"
import { useState } from "react"

import { BlueLink } from "@/components/blue-link"
import { IconButton } from "@/components/icon-button"
import { Badge } from "@/components/ui/badge"
import { TableCell, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/toast"
import { toSubmitErrorMessage } from "@/lib/utils"
import type { AdminQuizSummary } from "@/types/quiz"

import { submitDeleteQuiz } from "../-functions/delete-quiz"
import { DEFAULT_QUIZ_VISIBILITY } from "../-lib/constants"

export function QuizzesTableRow({ quiz }: { quiz: AdminQuizSummary }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)
  const title = quiz.displayTitle ?? quiz.urlSlug

  async function handleDelete() {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return

    setIsDeleting(true)
    try {
      const result = await submitDeleteQuiz({ data: { urlSlug: quiz.urlSlug } })
      if ("error" in result) {
        toast.add({ type: "error", description: result.error })
        return
      }
      toast.add({ type: "success", description: "Quiz deleted" })
      await router.invalidate()
    } catch (error) {
      toast.add({
        type: "error",
        description: toSubmitErrorMessage(error, "Failed to delete quiz."),
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="text-muted-foreground">{quiz.id}</TableCell>
      <TableCell>
        <BlueLink to="/manage/quizzes/$quizSlug" params={{ quizSlug: quiz.urlSlug }}>
          {title}
        </BlueLink>
      </TableCell>
      <TableCell>
        <Badge variant={quiz.visibility === "PUBLIC" ? "default" : "outline"}>
          {quiz.visibility ?? DEFAULT_QUIZ_VISIBILITY}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end">
          <IconButton
            tooltip="View Quiz"
            render={
              <a
                href={`/quizzes/${quiz.urlSlug}`}
                target="_blank"
                rel="noreferrer"
                aria-label={`View ${title}`}
              />
            }
            nativeButton={false}
          >
            <ExternalLink />
          </IconButton>
          <IconButton
            tooltip="Edit Quiz"
            render={
              <Link
                to="/manage/quizzes/$quizSlug"
                params={{ quizSlug: quiz.urlSlug }}
                aria-label={`Edit ${title}`}
              />
            }
            nativeButton={false}
          >
            <Pencil />
          </IconButton>
          <IconButton
            tooltip="Delete Quiz"
            className="hover:text-destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            <Trash2 />
          </IconButton>
        </div>
      </TableCell>
    </TableRow>
  )
}
