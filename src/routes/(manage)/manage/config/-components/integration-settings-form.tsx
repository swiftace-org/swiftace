import { useRouter } from "@tanstack/react-router"
import { useState } from "react"

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
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { getSiteOrigin, refreshSession, toSubmitErrorMessage } from "@/lib/utils"
import type { Integration, IntegrationSettings } from "@/types/site-config"

import { submitIntegrationSettings } from "../-functions/submit-integration-settings"
import {
  CONFIG_URL_MAX_LENGTH,
  INTEGRATION_DETAILS,
  INTEGRATION_KEY_MAX_LENGTH,
  INTEGRATION_ORDER,
  type IntegrationFieldDetail,
} from "../-lib/constants"

export function IntegrationSettingsForm({
  settings,
  savedSecrets: initialSavedSecrets,
  integration,
}: {
  settings: IntegrationSettings
  savedSecrets: string[]
  integration?: Integration
}) {
  const shown = integration
    ? [integration]
    : INTEGRATION_ORDER.filter((key) => key !== "notebookPreview")
  const router = useRouter()
  const origin = getSiteOrigin()
  const [values, setValues] = useState(settings)
  const [savedSecrets, setSavedSecrets] = useState(initialSavedSecrets)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string>()

  function updateIntegration(integration: Integration, change: Record<string, string | boolean>) {
    setValues((current) => ({
      ...current,
      [integration]: { ...current[integration], ...change },
    }))
  }

  // Validated on the server only, since it alone knows which blank secrets are already saved.
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    setError(undefined)
    try {
      const result = await submitIntegrationSettings({
        data: { values: Object.fromEntries(shown.map((key) => [key, values[key]])) },
      })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setValues(result.integrations)
      setSavedSecrets(result.savedSecrets)
      toast.add({ type: "success", description: "Integrations saved!" })
      await refreshSession(router)
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to save the integrations."))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <FieldDescription>
          Changes apply as soon as you save. Secrets are never shown again once saved — leave one
          blank to keep it, or type a new value to replace it.
        </FieldDescription>
        {shown.map((integration, index) => {
          const { title, describe, fields } = INTEGRATION_DETAILS[integration]
          const current = values[integration] as unknown as Record<string, string | boolean>
          const id = `config-integration-${integration}`

          return (
            <div key={integration} className="flex flex-col gap-4">
              {index > 0 && <Separator />}
              <Field orientation="horizontal">
                <Switch
                  id={id}
                  checked={values[integration].enabled}
                  onCheckedChange={(checked) =>
                    updateIntegration(integration, { enabled: checked })
                  }
                />
                <FieldContent>
                  <FieldLabel htmlFor={id}>{title}</FieldLabel>
                  <FieldDescription>{describe(origin)}</FieldDescription>
                </FieldContent>
              </Field>
              {(integration !== "notebookPreview" || current.enabled) && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(fields as Record<string, IntegrationFieldDetail>).map(
                    ([key, field]) => (
                      <IntegrationField
                        key={key}
                        id={`${id}-${key}`}
                        field={field}
                        value={String(current[key] ?? "")}
                        isSaved={savedSecrets.includes(`${integration}.${key}`)}
                        onChange={(value) => updateIntegration(integration, { [key]: value })}
                      />
                    ),
                  )}
                </div>
              )}
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

function IntegrationField({
  id,
  field,
  value,
  isSaved,
  onChange,
}: {
  id: string
  field: IntegrationFieldDetail
  value: string
  isSaved: boolean
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{field.label}</FieldLabel>
      <Input
        id={id}
        type={field.secret ? "password" : field.url ? "url" : field.email ? "email" : "text"}
        // Keeps the browser from offering to save, or autofill, an admin's login here.
        autoComplete={field.secret ? "new-password" : "off"}
        maxLength={field.url ? CONFIG_URL_MAX_LENGTH : INTEGRATION_KEY_MAX_LENGTH}
        placeholder={field.secret && isSaved ? "••••••••••••" : field.placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {field.secret && <FieldDescription>{isSaved ? "Saved." : "Not saved yet."}</FieldDescription>}
    </Field>
  )
}
