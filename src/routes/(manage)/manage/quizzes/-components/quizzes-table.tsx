import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AdminQuizSummary } from "@/types/quiz"

import { QuizzesTableRow } from "./quizzes-table-row"

export function QuizzesTable({ quizzes }: { quizzes: AdminQuizSummary[] }) {
  if (!quizzes.length) {
    return <p className="text-sm text-muted-foreground">No quizzes yet.</p>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>Quiz Title</TableHead>
          <TableHead>Visibility</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {quizzes.map((quiz) => (
          <QuizzesTableRow key={quiz.id} quiz={quiz} />
        ))}
      </TableBody>
    </Table>
  )
}
