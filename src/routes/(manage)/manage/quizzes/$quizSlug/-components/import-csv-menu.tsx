import { MoreVertical } from "lucide-react"
import { useRef } from "react"

import { IconButton } from "@/components/icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/toast"
import { parseCsv } from "@/lib/utils"
import type { AdminQuizOption, AdminQuizQuestion, QuizAnswerMethod } from "@/types/quiz"

export function ImportCsvMenu({
  nextTempId,
  onImport,
}: {
  nextTempId: () => string
  onImport: (questions: AdminQuizQuestion[]) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!window.confirm(`Are you sure you want to upload the file "${file.name}"?`)) return
    const text = await file.text()
    const imported = parseQuizCsv(text, nextTempId)
    if (!imported.length) {
      toast.add({ type: "error", description: "No questions found in the CSV file." })
      return
    }
    onImport(imported)
    toast.add({ type: "success", description: `Imported ${imported.length} question(s).` })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <IconButton tooltip="More options" variant="outline">
              <MoreVertical />
            </IconButton>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
            Import CSV
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
    </>
  )
}

/**
 * Parses a quiz CSV export into editor questions. Expects a header row with
 * `Question`, `Optional`, `Type`, `Text Answer`, `Text Explanation` columns
 * followed by repeating option triples (value, correct, explanation).
 */
function parseQuizCsv(text: string, nextTempId: () => string): AdminQuizQuestion[] {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ""))
  if (rows.length < 2) return []

  const header = rows[0].map((cell) => cell.trim().toLowerCase())
  const columnIndex = (name: string) => header.indexOf(name)
  const titleIdx = columnIndex("question")
  const optionalIdx = columnIndex("optional")
  const typeIdx = columnIndex("type")
  const answerIdx = columnIndex("text answer")
  const explanationIdx = columnIndex("text explanation")
  const metaIdxs = [
    columnIndex("id"),
    titleIdx,
    optionalIdx,
    typeIdx,
    answerIdx,
    explanationIdx,
  ].filter((index) => index >= 0)
  const optionStart = metaIdxs.length ? Math.max(...metaIdxs) + 1 : header.length

  const cellAt = (cells: string[], index: number) => (index >= 0 ? (cells[index] ?? "").trim() : "")

  // Rows without a question are skipped, matching the legacy backend which
  // silently dropped title-less questions.
  const questionRows = rows.slice(1).filter((cells) => cellAt(cells, titleIdx) !== "")

  return questionRows.map((cells) => {
    const rawType = cellAt(cells, typeIdx).toLowerCase()
    const answerMethod: QuizAnswerMethod =
      rawType === "multiple" || rawType === "text" ? rawType : "single"

    const options: AdminQuizOption[] = []
    if (answerMethod !== "text") {
      for (let i = optionStart; i < cells.length; i += 3) {
        const value = (cells[i] ?? "").trim()
        if (!value) continue
        options.push({
          id: options.length + 1,
          value,
          correct: (cells[i + 1] ?? "").trim().toLowerCase() === "true",
          explanation: (cells[i + 2] ?? "").trim(),
        })
      }
    }

    return {
      id: nextTempId(),
      title: cellAt(cells, titleIdx),
      answerMethod,
      optional: cellAt(cells, optionalIdx).toLowerCase() === "true",
      correctAnswer: cellAt(cells, answerIdx),
      explanation: cellAt(cells, explanationIdx),
      options,
    }
  })
}
