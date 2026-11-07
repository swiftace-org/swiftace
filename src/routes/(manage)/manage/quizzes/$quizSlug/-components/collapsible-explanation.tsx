import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

import { Textarea } from "@/components/ui/textarea"

export function CollapsibleExplanation({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="flex cursor-pointer items-center gap-1 text-sm font-medium text-muted-foreground"
        onClick={() => setOpen((current) => !current)}
      >
        Explanation
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open ? (
        <Textarea
          placeholder="Markdown supported"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : null}
    </div>
  )
}
