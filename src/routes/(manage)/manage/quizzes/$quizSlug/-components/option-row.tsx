import { ChevronDown, ChevronUp, Trash2 } from "lucide-react"

import { IconButton } from "@/components/icon-button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import type { AdminQuizOption } from "@/types/quiz"

import { CollapsibleExplanation } from "./collapsible-explanation"

export function OptionRow({
  option,
  optionIndex,
  optionCount,
  isRadio,
  onToggleCorrect,
  onChangeValue,
  onChangeExplanation,
  onRemove,
  onMove,
}: {
  option: AdminQuizOption
  optionIndex: number
  optionCount: number
  isRadio: boolean
  onToggleCorrect: () => void
  onChangeValue: (value: string) => void
  onChangeExplanation: (value: string) => void
  onRemove: () => void
  onMove: (direction: -1 | 1) => void
}) {
  return (
    <div className="flex gap-3 rounded-md border bg-muted/30 p-3">
      <div className="flex flex-col items-center gap-1 pt-1">
        <Checkbox
          checked={option.correct}
          className={isRadio ? "rounded-full" : undefined}
          aria-label="Mark option as correct"
          onCheckedChange={onToggleCorrect}
        />
        <IconButton tooltip="Remove Option" className="hover:text-destructive" onClick={onRemove}>
          <Trash2 />
        </IconButton>
        <IconButton tooltip="Move Up" disabled={optionIndex <= 0} onClick={() => onMove(-1)}>
          <ChevronUp />
        </IconButton>
        <IconButton
          tooltip="Move Down"
          disabled={optionIndex >= optionCount - 1}
          onClick={() => onMove(1)}
        >
          <ChevronDown />
        </IconButton>
      </div>
      <div className="flex-1 space-y-2">
        <Textarea
          placeholder="Option text (Markdown supported)"
          value={option.value}
          onChange={(event) => onChangeValue(event.target.value)}
        />
        <CollapsibleExplanation value={option.explanation} onChange={onChangeExplanation} />
      </div>
    </div>
  )
}
