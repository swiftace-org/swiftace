import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { GeneralSettings, SocialLink } from "@/types/site-config"

import { submitGeneralSettings } from "../-functions/submit-general-settings"
import {
  COMPANY_NAME_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  SITE_NAME_MAX_LENGTH,
  SOCIAL_LINK_LABEL_MAX_LENGTH,
  SOCIAL_LINKS_MAX_COUNT,
  TAGLINE_MAX_LENGTH,
} from "../-lib/constants"
import { useSettingsForm } from "../-lib/hooks"
import { toGeneralSettings } from "../-lib/utils"

export function GeneralSettingsForm({ settings }: { settings: GeneralSettings }) {
  const { values, setValues, isSaving, error, handleSubmit } = useSettingsForm({
    settings,
    check: toGeneralSettings,
    submit: submitGeneralSettings,
    name: "general settings",
  })

  function updateField<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateSocialLink(index: number, link: Partial<SocialLink>) {
    updateField(
      "socialLinks",
      values.socialLinks.map((current, i) => (i === index ? { ...current, ...link } : current)),
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="config-site-name">Site name</FieldLabel>
            <Input
              id="config-site-name"
              required
              maxLength={SITE_NAME_MAX_LENGTH}
              value={values.siteName}
              onChange={(event) => updateField("siteName", event.target.value)}
            />
            <FieldDescription>
              In page titles, emails and the logo&apos;s alt text.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="config-company-name">Company name</FieldLabel>
            <Input
              id="config-company-name"
              maxLength={COMPANY_NAME_MAX_LENGTH}
              placeholder={values.siteName}
              value={values.companyName}
              onChange={(event) => updateField("companyName", event.target.value)}
            />
            <FieldDescription>
              The footer&apos;s copyright holder. Leave blank to use the site name.
            </FieldDescription>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="config-tagline">Tagline</FieldLabel>
          <Input
            id="config-tagline"
            required
            maxLength={TAGLINE_MAX_LENGTH}
            value={values.tagline}
            onChange={(event) => updateField("tagline", event.target.value)}
          />
          <FieldDescription>
            The home page&apos;s title in search results, shown as &ldquo;
            {values.tagline.trim() || "Tagline"} — {values.siteName.trim() || "Site name"}&rdquo;.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="config-description">Description</FieldLabel>
          <Textarea
            id="config-description"
            required
            rows={3}
            maxLength={DESCRIPTION_MAX_LENGTH}
            value={values.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
          <FieldDescription>
            What search results and link previews say about pages that don&apos;t have their own.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="config-support-email">Support email</FieldLabel>
          <Input
            id="config-support-email"
            type="email"
            required
            value={values.supportEmail}
            onChange={(event) => updateField("supportEmail", event.target.value)}
          />
          <FieldDescription>
            Receives support requests, and every reply to an email the site sends.
          </FieldDescription>
        </Field>
        <FieldSet className="gap-3">
          <FieldLegend variant="label">Social links</FieldLegend>
          <FieldDescription>Listed in the footer, after Contact.</FieldDescription>
          {values.socialLinks.map((link, index) => (
            // Rows have no id of their own, and every input is controlled, so an index key is safe.
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Link ${index + 1} label`}
                className="w-36 shrink-0"
                placeholder="YouTube"
                maxLength={SOCIAL_LINK_LABEL_MAX_LENGTH}
                value={link.label}
                onChange={(event) => updateSocialLink(index, { label: event.target.value })}
              />
              <Input
                aria-label={`Link ${index + 1} URL`}
                type="url"
                placeholder="https://…"
                value={link.url}
                onChange={(event) => updateSocialLink(index, { url: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove link ${index + 1}`}
                onClick={() =>
                  updateField(
                    "socialLinks",
                    values.socialLinks.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          {values.socialLinks.length < SOCIAL_LINKS_MAX_COUNT && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                updateField("socialLinks", [...values.socialLinks, { label: "", url: "" }])
              }
            >
              <PlusIcon />
              Add link
            </Button>
          )}
        </FieldSet>
        <FieldError>{error}</FieldError>
        <Button type="submit" className="self-start" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </FieldGroup>
    </form>
  )
}
