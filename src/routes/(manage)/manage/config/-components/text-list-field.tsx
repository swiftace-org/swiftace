import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FieldDescription, FieldLegend, FieldSet } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/** An editable list of one-line items, like a plan's benefits. Blank rows are dropped on save. */
export function TextListField({
  legend,
  description,
  itemName,
  items,
  maxCount,
  maxLength,
  onChange,
}: {
  legend: string
  description?: string
  /** Names each row for screen readers, as in "Benefit 2". */
  itemName: string
  items: string[]
  maxCount: number
  maxLength: number
  onChange: (items: string[]) => void
}) {
  return (
    <FieldSet className="gap-3">
      <FieldLegend variant="label">{legend}</FieldLegend>
      {description && <FieldDescription>{description}</FieldDescription>}
      {items.map((item, index) => (
        // Rows have no id of their own, and every input is controlled, so an index key is safe.
        <div key={index} className="flex items-center gap-2">
          <Input
            aria-label={`${itemName} ${index + 1}`}
            maxLength={maxLength}
            value={item}
            onChange={(event) =>
              onChange(items.map((current, i) => (i === index ? event.target.value : current)))
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Remove ${itemName.toLowerCase()} ${index + 1}`}
            onClick={() => onChange(items.filter((_, i) => i !== index))}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      {items.length < maxCount && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => onChange([...items, ""])}
        >
          <PlusIcon />
          Add {itemName.toLowerCase()}
        </Button>
      )}
    </FieldSet>
  )
}
