import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import type {
  AiTutorModel,
  AiTutorPlan,
  AiTutorPlanSettings,
  AiTutorSettings,
} from "@/types/ai-tutor"

import { submitAiTutorPlans } from "../-functions/submit-ai-tutor-plans"
import {
  AI_TUTOR_LIMIT_MAX_USD,
  AI_TUTOR_PLAN_OPTIONS,
  AI_TUTOR_REASONING_EFFORT_OPTIONS,
} from "../-lib/constants"
import { toAiTutorPlans } from "../-lib/utils"
import { useSettingsForm } from "../../config/-lib/hooks"

const REASONING_EFFORT_LABELS = Object.fromEntries(
  AI_TUTOR_REASONING_EFFORT_OPTIONS.map((option) => [option.value, option.label]),
)

export function AiTutorPlansForm({
  plans,
  models,
}: {
  plans: AiTutorSettings["plans"]
  models: AiTutorModel[]
}) {
  const { values, setValues, isSaving, error, handleSubmit } = useSettingsForm({
    settings: plans,
    check: (current) => toAiTutorPlans(current, models),
    submit: submitAiTutorPlans,
    name: "plans",
  })
  const modelLabels = Object.fromEntries(models.map((model) => [model.id, model.id]))

  function updatePlan(plan: AiTutorPlan, change: Partial<AiTutorPlanSettings>) {
    setValues((current) => ({ ...current, [plan]: { ...current[plan], ...change } }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-6">
        <FieldDescription>
          Each plan has its own model and spending limits. A learner&apos;s 5-hour window starts
          with their first message and, once they hit its limit, they wait for it to reset; the
          weekly window works the same way over 7 days. Admins are never limited.
        </FieldDescription>
        {AI_TUTOR_PLAN_OPTIONS.map(({ value: plan, label, description }, index) => {
          const settings = values[plan]
          const id = `ai-tutor-plan-${plan}`
          return (
            <div key={plan} className="flex flex-col gap-6">
              {index > 0 && <Separator />}
              <FieldSet className="gap-4">
                <FieldLegend>{label}</FieldLegend>
                <Field orientation="horizontal">
                  <Switch
                    id={`${id}-enabled`}
                    checked={settings.enabled}
                    onCheckedChange={(checked) => updatePlan(plan, { enabled: checked })}
                  />
                  <FieldContent>
                    <FieldLabel htmlFor={`${id}-enabled`}>Available on {label}</FieldLabel>
                    <FieldDescription>
                      {description} While off, they see the tutor with an invitation to upgrade.
                    </FieldDescription>
                  </FieldContent>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor={`${id}-model`}>Model</FieldLabel>
                    <Select
                      items={modelLabels}
                      value={settings.model}
                      onValueChange={(value) => updatePlan(plan, { model: value as string })}
                    >
                      <SelectTrigger id={`${id}-model`} className="h-9! w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor={`${id}-effort`}>Reasoning effort</FieldLabel>
                    <Select
                      items={REASONING_EFFORT_LABELS}
                      value={settings.reasoningEffort}
                      onValueChange={(value) =>
                        updatePlan(plan, {
                          reasoningEffort: value as AiTutorPlanSettings["reasoningEffort"],
                        })
                      }
                    >
                      <SelectTrigger id={`${id}-effort`} className="h-9! w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_TUTOR_REASONING_EFFORT_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <UsdField
                    id={`${id}-session`}
                    label="5-hour limit"
                    value={settings.sessionLimitUsd}
                    onChange={(value) => updatePlan(plan, { sessionLimitUsd: value })}
                  />
                  <UsdField
                    id={`${id}-weekly`}
                    label="Weekly limit"
                    value={settings.weeklyLimitUsd}
                    onChange={(value) => updatePlan(plan, { weeklyLimitUsd: value })}
                  />
                </div>
              </FieldSet>
            </div>
          )
        })}
        <FieldError>{error}</FieldError>
        <Button type="submit" className="self-start" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </FieldGroup>
    </form>
  )
}

function UsdField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label} (USD)</FieldLabel>
      <Input
        id={id}
        type="number"
        required
        min={0}
        max={AI_TUTOR_LIMIT_MAX_USD}
        step={0.01}
        value={Number.isNaN(value) ? "" : value}
        onChange={(event) => onChange(event.target.valueAsNumber)}
      />
    </Field>
  )
}
