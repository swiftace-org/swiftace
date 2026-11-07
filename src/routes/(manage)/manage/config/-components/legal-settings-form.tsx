import { BlueLink } from "@/components/blue-link"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import type { LegalSettings } from "@/types/site-config"

import { submitLegalSettings } from "../-functions/submit-legal-settings"
import { LEGAL_DOCUMENT_MAX_LENGTH } from "../-lib/constants"
import { useSettingsForm } from "../-lib/hooks"
import { toLegalSettings } from "../-lib/utils"

const LEGAL_DOCUMENTS = [
  { key: "termsOfService", label: "Terms of Service", path: "/terms-of-service.html" },
  { key: "privacyPolicy", label: "Privacy Policy", path: "/privacy-policy.html" },
] as const

export function LegalSettingsForm({ settings }: { settings: LegalSettings }) {
  const { values, setValues, isSaving, error, handleSubmit } = useSettingsForm({
    settings,
    check: toLegalSettings,
    submit: submitLegalSettings,
    name: "legal pages",
  })

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <p className="text-sm text-muted-foreground">
          Written in Markdown. <code>{"{{SITE_NAME}}"}</code> and <code>{"{{SUPPORT_EMAIL}}"}</code>{" "}
          are replaced with the values on the General tab.
        </p>
        {LEGAL_DOCUMENTS.map(({ key, label, path }) => (
          <Field key={key}>
            <FieldLabel htmlFor={`config-legal-${key}`}>{label}</FieldLabel>
            <Textarea
              id={`config-legal-${key}`}
              required
              rows={16}
              maxLength={LEGAL_DOCUMENT_MAX_LENGTH}
              className="max-h-[32rem] font-mono text-xs"
              value={values[key]}
              onChange={(event) => setValues({ ...values, [key]: event.target.value })}
            />
            <FieldDescription>
              Shown at{" "}
              <BlueLink colored to={path} target="_blank">
                {path}
              </BlueLink>
              , and linked from the footer and the login page.
            </FieldDescription>
          </Field>
        ))}
        <FieldError>{error}</FieldError>
        <Button type="submit" className="self-start" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </FieldGroup>
    </form>
  )
}
