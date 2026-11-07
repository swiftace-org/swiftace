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
import type { HeroStat, HomeSettings } from "@/types/site-config"

import { submitHomeSettings } from "../-functions/submit-home-settings"
import {
  HERO_HEADLINE_MAX_LENGTH,
  HERO_STAT_LABEL_MAX_LENGTH,
  HERO_STAT_VALUE_MAX_LENGTH,
  HERO_STATS_MAX_COUNT,
  HERO_SUBTITLE_MAX_LENGTH,
} from "../-lib/constants"
import { useSettingsForm } from "../-lib/hooks"
import { toHomeSettings } from "../-lib/utils"

export function HomeSettingsForm({ settings }: { settings: HomeSettings }) {
  const { values, setValues, isSaving, error, handleSubmit } = useSettingsForm({
    settings,
    check: toHomeSettings,
    submit: submitHomeSettings,
    name: "home page settings",
  })

  function updateStat(index: number, stat: Partial<HeroStat>) {
    setValues((current) => ({
      ...current,
      stats: current.stats.map((existing, i) =>
        i === index ? { ...existing, ...stat } : existing,
      ),
    }))
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-5">
        <Field>
          <FieldLabel htmlFor="config-hero-headline">Headline</FieldLabel>
          <Textarea
            id="config-hero-headline"
            required
            rows={2}
            maxLength={HERO_HEADLINE_MAX_LENGTH}
            value={values.headline}
            onChange={(event) => setValues({ ...values, headline: event.target.value })}
          />
          <FieldDescription>
            The landing page&apos;s heading. Start a new line where it should break on wide screens.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="config-hero-subtitle">Subtitle</FieldLabel>
          <Textarea
            id="config-hero-subtitle"
            required
            rows={2}
            maxLength={HERO_SUBTITLE_MAX_LENGTH}
            value={values.subtitle}
            onChange={(event) => setValues({ ...values, subtitle: event.target.value })}
          />
        </Field>
        <FieldSet className="gap-3">
          <FieldLegend variant="label">Stats</FieldLegend>
          <FieldDescription>
            Up to {HERO_STATS_MAX_COUNT} figures beside the headline, like &ldquo;800+ hours of
            coursework&rdquo;. Leave empty to show none.
          </FieldDescription>
          {values.stats.map((stat, index) => (
            // Rows have no id of their own, and every input is controlled, so an index key is safe.
            <div key={index} className="flex items-center gap-2">
              <Input
                aria-label={`Stat ${index + 1} number`}
                className="w-28 shrink-0"
                placeholder="800+"
                maxLength={HERO_STAT_VALUE_MAX_LENGTH}
                value={stat.value}
                onChange={(event) => updateStat(index, { value: event.target.value })}
              />
              <Input
                aria-label={`Stat ${index + 1} label`}
                placeholder="hours of coursework"
                maxLength={HERO_STAT_LABEL_MAX_LENGTH}
                value={stat.label}
                onChange={(event) => updateStat(index, { label: event.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove stat ${index + 1}`}
                onClick={() =>
                  setValues({ ...values, stats: values.stats.filter((_, i) => i !== index) })
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          {values.stats.length < HERO_STATS_MAX_COUNT && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() =>
                setValues({ ...values, stats: [...values.stats, { value: "", label: "" }] })
              }
            >
              <PlusIcon />
              Add stat
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
