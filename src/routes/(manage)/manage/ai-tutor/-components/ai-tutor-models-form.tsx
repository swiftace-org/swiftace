import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AiTutorModel, AiTutorSettings } from "@/types/ai-tutor"

import { submitAiTutorModels } from "../-functions/submit-ai-tutor-models"
import {
  AI_TUTOR_MODEL_ID_MAX_LENGTH,
  AI_TUTOR_MODELS_MAX_COUNT,
  AI_TUTOR_PRICE_MAX_USD,
} from "../-lib/constants"
import { toAiTutorModels } from "../-lib/utils"
import { useSettingsForm } from "../../config/-lib/hooks"

const PRICE_COLUMNS = [
  { key: "inputPerMillion", label: "Input" },
  { key: "cachedInputPerMillion", label: "Cached input" },
  { key: "outputPerMillion", label: "Output" },
] as const

export function AiTutorModelsForm({
  models,
  plans,
}: {
  models: AiTutorModel[]
  plans: AiTutorSettings["plans"]
}) {
  const { values, setValues, isSaving, error, handleSubmit } = useSettingsForm({
    settings: models,
    check: (current) => toAiTutorModels(current, plans),
    submit: submitAiTutorModels,
    name: "models",
  })

  function updateModel(index: number, change: Partial<AiTutorModel>) {
    setValues((current) =>
      current.map((model, i) => (i === index ? { ...model, ...change } : model)),
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-4">
        <FieldDescription>
          The OpenAI models the plans can use, priced in USD per million tokens as on OpenAI&apos;s
          pricing page. Every reply is costed with these, so update them when OpenAI&apos;s prices
          change.
        </FieldDescription>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Model ID</TableHead>
                {PRICE_COLUMNS.map((column) => (
                  <TableHead key={column.key} className="w-28">
                    {column.label}
                  </TableHead>
                ))}
                <TableHead className="w-10">
                  <span className="sr-only">Remove</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {values.map((model, index) => (
                // Rows have no id until saved, and every input is controlled, so an index key is safe.
                // oxlint-disable-next-line react/no-array-index-key
                <TableRow key={index}>
                  <TableCell>
                    <Input
                      aria-label={`Model ${index + 1} ID`}
                      required
                      maxLength={AI_TUTOR_MODEL_ID_MAX_LENGTH}
                      placeholder="gpt-6.1-terra"
                      className="font-mono text-xs"
                      value={model.id}
                      onChange={(event) => updateModel(index, { id: event.target.value })}
                    />
                  </TableCell>
                  {PRICE_COLUMNS.map((column) => (
                    <TableCell key={column.key}>
                      <Input
                        aria-label={`Model ${index + 1} ${column.label.toLowerCase()} price`}
                        type="number"
                        required
                        min={0}
                        max={AI_TUTOR_PRICE_MAX_USD}
                        step="any"
                        value={Number.isNaN(model[column.key]) ? "" : model[column.key]}
                        onChange={(event) =>
                          updateModel(index, { [column.key]: event.target.valueAsNumber })
                        }
                      />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${model.id || `model ${index + 1}`}`}
                      onClick={() => setValues((current) => current.filter((_, i) => i !== index))}
                    >
                      <Trash2Icon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {values.length < AI_TUTOR_MODELS_MAX_COUNT && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() =>
              setValues((current) => [
                ...current,
                { id: "", inputPerMillion: 0, cachedInputPerMillion: 0, outputPerMillion: 0 },
              ])
            }
          >
            <PlusIcon />
            Add model
          </Button>
        )}
        <FieldError>{error}</FieldError>
        <Button type="submit" className="self-start" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </FieldGroup>
    </form>
  )
}
