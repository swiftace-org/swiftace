import { PlusIcon, Trash2Icon } from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useSiteConfig } from "@/lib/hooks"
import type { FaqItem, PricingSettings } from "@/types/site-config"

import { submitPricingSettings } from "../-functions/submit-pricing-settings"
import {
  FAQ_ANSWER_MAX_LENGTH,
  FAQ_MAX_COUNT,
  FAQ_QUESTION_MAX_LENGTH,
  PLAN_BENEFIT_MAX_LENGTH,
  PLAN_BENEFITS_MAX_COUNT,
  PLAN_NAME_MAX_LENGTH,
  PLAN_TAGLINE_MAX_LENGTH,
  PRICING_EYEBROW_MAX_LENGTH,
  PRICING_HEADLINE_MAX_LENGTH,
  PRICING_SUBTITLE_MAX_LENGTH,
  TRIAL_DAYS_MAX,
} from "../-lib/constants"
import { useSettingsForm } from "../-lib/hooks"
import { toPricingSettings } from "../-lib/utils"
import { toSubscriptionPlanName } from "../../../../(billing)/-lib/utils"
import { TextListField } from "./text-list-field"

export function PricingSettingsForm({ settings }: { settings: PricingSettings }) {
  const { general } = useSiteConfig()
  const { values, setValues, isSaving, error, handleSubmit } = useSettingsForm({
    settings,
    check: toPricingSettings,
    submit: submitPricingSettings,
    name: "pricing settings",
  })

  function updateField<K extends keyof PricingSettings>(key: K, value: PricingSettings[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateFaqItem(index: number, item: Partial<FaqItem>) {
    updateField(
      "faq",
      values.faq.map((current, i) => (i === index ? { ...current, ...item } : current)),
    )
  }

  function textField(
    key: "monthlyPlanName" | "yearlyPlanName" | "freePlanName" | "eyebrow" | "headline",
    label: string,
    maxLength: number,
  ) {
    return (
      <Field>
        <FieldLabel htmlFor={`config-pricing-${key}`}>{label}</FieldLabel>
        <Input
          id={`config-pricing-${key}`}
          required
          maxLength={maxLength}
          value={values[key]}
          onChange={(event) => updateField(key, event.target.value)}
        />
      </Field>
    )
  }

  function taglineField(
    key: "monthlyTagline" | "yearlyTagline" | "freePlanTagline",
    label: string,
  ) {
    return (
      <Field>
        <FieldLabel htmlFor={`config-pricing-${key}`}>{label}</FieldLabel>
        <Input
          id={`config-pricing-${key}`}
          required
          maxLength={PLAN_TAGLINE_MAX_LENGTH}
          value={values[key]}
          onChange={(event) => updateField(key, event.target.value)}
        />
      </Field>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup className="gap-8">
        <p className="text-sm text-muted-foreground">
          The words on the pricing page and the plan&apos;s name everywhere else. Prices come from
          the Stripe prices on the Integrations tab.
        </p>
        <FieldSet className="gap-5">
          <FieldLegend>Paid plan</FieldLegend>
          <Field>
            <FieldLabel htmlFor="config-pricing-plan-name">Plan name</FieldLabel>
            <Input
              id="config-pricing-plan-name"
              maxLength={PLAN_NAME_MAX_LENGTH}
              placeholder={toSubscriptionPlanName({ general, pricing: { planName: "" } })}
              value={values.planName}
              onChange={(event) => updateField("planName", event.target.value)}
            />
            <FieldDescription>
              In emails, the upgrade prompt and account settings. Leave blank to use the site name
              followed by &ldquo;Pro&rdquo;.
            </FieldDescription>
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            {textField("yearlyPlanName", "Yearly plan card", PLAN_NAME_MAX_LENGTH)}
            {textField("monthlyPlanName", "Monthly plan card", PLAN_NAME_MAX_LENGTH)}
          </div>
          {taglineField("yearlyTagline", "Yearly plan tagline")}
          {taglineField("monthlyTagline", "Monthly plan tagline")}
          <TextListField
            legend="Benefits"
            description="Listed on both paid cards, and in the email that starts a trial."
            itemName="Benefit"
            items={values.benefits}
            maxCount={PLAN_BENEFITS_MAX_COUNT}
            maxLength={PLAN_BENEFIT_MAX_LENGTH}
            onChange={(benefits) => updateField("benefits", benefits)}
          />
        </FieldSet>
        <FieldSet className="gap-5">
          <FieldLegend>Free trial</FieldLegend>
          <Field orientation="horizontal">
            <Switch
              id="config-pricing-trial-enabled"
              checked={values.trialEnabled}
              onCheckedChange={(checked) => updateField("trialEnabled", checked)}
            />
            <FieldContent>
              <FieldLabel htmlFor="config-pricing-trial-enabled">Offer a free trial</FieldLabel>
              <FieldDescription>
                On a learner&apos;s first subscription only. They add a card at checkout and
                aren&apos;t charged until it ends.
              </FieldDescription>
            </FieldContent>
          </Field>
          <Field className="sm:w-48">
            <FieldLabel htmlFor="config-pricing-trial-days">Trial length in days</FieldLabel>
            <Input
              id="config-pricing-trial-days"
              type="number"
              required
              min={1}
              max={TRIAL_DAYS_MAX}
              step={1}
              value={Number.isNaN(values.trialDays) ? "" : values.trialDays}
              onChange={(event) => updateField("trialDays", event.target.valueAsNumber)}
            />
          </Field>
        </FieldSet>
        <FieldSet className="gap-5">
          <FieldLegend>Free plan</FieldLegend>
          <FieldDescription>
            Shown beside the paid plans for comparison. Describe what a learner without a
            subscription can really do, since nothing here changes what they can open.
          </FieldDescription>
          {textField("freePlanName", "Name", PLAN_NAME_MAX_LENGTH)}
          {taglineField("freePlanTagline", "Tagline")}
          <TextListField
            legend="Benefits"
            itemName="Benefit"
            items={values.freePlanBenefits}
            maxCount={PLAN_BENEFITS_MAX_COUNT}
            maxLength={PLAN_BENEFIT_MAX_LENGTH}
            onChange={(freePlanBenefits) => updateField("freePlanBenefits", freePlanBenefits)}
          />
        </FieldSet>
        <FieldSet className="gap-5">
          <FieldLegend>Page heading</FieldLegend>
          {textField("eyebrow", "Eyebrow", PRICING_EYEBROW_MAX_LENGTH)}
          {textField("headline", "Headline", PRICING_HEADLINE_MAX_LENGTH)}
          <Field>
            <FieldLabel htmlFor="config-pricing-subtitle">Subtitle</FieldLabel>
            <Textarea
              id="config-pricing-subtitle"
              required
              rows={3}
              maxLength={PRICING_SUBTITLE_MAX_LENGTH}
              value={values.subtitle}
              onChange={(event) => updateField("subtitle", event.target.value)}
            />
          </Field>
        </FieldSet>
        <FieldSet className="gap-3">
          <FieldLegend>Frequently asked questions</FieldLegend>
          <FieldDescription>
            Below the plans, beside a line pointing to the support email. Mention the trial length
            here yourself if you offer one.
          </FieldDescription>
          {values.faq.map((item, index) => (
            // Rows have no id of their own, and every input is controlled, so an index key is safe.
            <div key={index} className="flex items-start gap-2">
              <div className="flex flex-1 flex-col gap-2">
                <Input
                  aria-label={`Question ${index + 1}`}
                  placeholder="Question"
                  maxLength={FAQ_QUESTION_MAX_LENGTH}
                  value={item.question}
                  onChange={(event) => updateFaqItem(index, { question: event.target.value })}
                />
                <Textarea
                  aria-label={`Answer ${index + 1}`}
                  placeholder="Answer"
                  rows={3}
                  maxLength={FAQ_ANSWER_MAX_LENGTH}
                  value={item.answer}
                  onChange={(event) => updateFaqItem(index, { answer: event.target.value })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove question ${index + 1}`}
                onClick={() =>
                  updateField(
                    "faq",
                    values.faq.filter((_, i) => i !== index),
                  )
                }
              >
                <Trash2Icon />
              </Button>
            </div>
          ))}
          {values.faq.length < FAQ_MAX_COUNT && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => updateField("faq", [...values.faq, { question: "", answer: "" }])}
            >
              <PlusIcon />
              Add question
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
