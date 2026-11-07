import { RotateCcwIcon } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_AI_TUTOR_SYSTEM_PROMPT } from "@/lib/config"

import { submitAiTutorGeneralSettings } from "../-functions/submit-ai-tutor-general-settings"
import {
  AI_TUTOR_NAME_MAX_LENGTH,
  AI_TUTOR_PROMPT_PLACEHOLDERS,
  AI_TUTOR_SYSTEM_PROMPT_MAX_LENGTH,
} from "../-lib/constants"
import { type AiTutorGeneralSettings, toAiTutorGeneralSettings } from "../-lib/utils"
import { useSettingsForm } from "../../config/-lib/hooks"

export function AiTutorGeneralForm({
  settings,
  openaiEnabled,
}: {
  settings: AiTutorGeneralSettings
  openaiEnabled: boolean
}) {
  const { values, setValues, isSaving, error, handleSubmit } = useSettingsForm({
    settings,
    check: toAiTutorGeneralSettings,
    submit: submitAiTutorGeneralSettings,
    name: "AI tutor settings",
  })

  function updateField<K extends keyof AiTutorGeneralSettings>(
    key: K,
    value: AiTutorGeneralSettings[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <Field orientation="horizontal">
          <Switch
            id="ai-tutor-enabled"
            checked={values.enabled}
            disabled={!openaiEnabled && !values.enabled}
            onCheckedChange={(checked) => updateField("enabled", checked)}
          />
          <FieldContent>
            <FieldLabel htmlFor="ai-tutor-enabled">Show the AI tutor in courses</FieldLabel>
            <FieldDescription>
              {openaiEnabled ? (
                "Adds a button to every course's navbar that opens the tutor beside the lesson. Signed-out visitors see it too, and are asked to sign in to chat."
              ) : (
                <>
                  Needs an OpenAI API key first:{" "}
                  <BlueLink to="/manage/config" search={{ tab: "integrations" }} colored>
                    turn on the OpenAI integration
                  </BlueLink>
                  .
                </>
              )}
            </FieldDescription>
          </FieldContent>
        </Field>
        <Field>
          <FieldLabel htmlFor="ai-tutor-name">Name</FieldLabel>
          <Input
            id="ai-tutor-name"
            required
            maxLength={AI_TUTOR_NAME_MAX_LENGTH}
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
          <FieldDescription>
            What learners see the tutor called, as in “Ask {values.name || "…"}”.
          </FieldDescription>
        </Field>
        <Field>
          <div className="flex items-end justify-between gap-2">
            <FieldLabel htmlFor="ai-tutor-system-prompt">System prompt</FieldLabel>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={values.systemPrompt === DEFAULT_AI_TUTOR_SYSTEM_PROMPT}
              onClick={() => updateField("systemPrompt", DEFAULT_AI_TUTOR_SYSTEM_PROMPT)}
            >
              <RotateCcwIcon />
              Restore default
            </Button>
          </div>
          <Textarea
            id="ai-tutor-system-prompt"
            required
            rows={18}
            maxLength={AI_TUTOR_SYSTEM_PROMPT_MAX_LENGTH}
            className="font-mono text-xs leading-relaxed"
            value={values.systemPrompt}
            onChange={(event) => updateField("systemPrompt", event.target.value)}
          />
          <FieldDescription>
            How the tutor teaches. {AI_TUTOR_PROMPT_PLACEHOLDERS.join(", ")} are filled in. The
            course outline, the learner&apos;s progress and the page they&apos;re on are added after
            it, and the tutor can read any lesson the learner can open.
          </FieldDescription>
        </Field>
        <FieldError>{error}</FieldError>
        <Button type="submit" className="self-start" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </FieldGroup>
    </form>
  )
}
