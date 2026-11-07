import type {
  FaqItem,
  GeneralSettings,
  HeroStat,
  HomeSettings,
  LegalSettings,
  PricingSettings,
  SocialLink,
} from "@/types/site-config"

import {
  COMPANY_NAME_MAX_LENGTH,
  CONFIG_URL_MAX_LENGTH,
  DESCRIPTION_MAX_LENGTH,
  FAQ_ANSWER_MAX_LENGTH,
  FAQ_MAX_COUNT,
  FAQ_QUESTION_MAX_LENGTH,
  HERO_HEADLINE_MAX_LENGTH,
  HERO_STAT_LABEL_MAX_LENGTH,
  HERO_STAT_VALUE_MAX_LENGTH,
  HERO_STATS_MAX_COUNT,
  HERO_SUBTITLE_MAX_LENGTH,
  LEGAL_DOCUMENT_MAX_LENGTH,
  PLAN_BENEFIT_MAX_LENGTH,
  PLAN_BENEFITS_MAX_COUNT,
  PLAN_NAME_MAX_LENGTH,
  PLAN_TAGLINE_MAX_LENGTH,
  PRICING_EYEBROW_MAX_LENGTH,
  PRICING_HEADLINE_MAX_LENGTH,
  PRICING_SUBTITLE_MAX_LENGTH,
  SITE_NAME_MAX_LENGTH,
  SOCIAL_LINK_LABEL_MAX_LENGTH,
  SOCIAL_LINKS_MAX_COUNT,
  SUPPORT_EMAIL_MAX_LENGTH,
  TAGLINE_MAX_LENGTH,
  TRIAL_DAYS_MAX,
} from "./constants"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Run by the form and again by the server function, so both reject the same input. */
export function toGeneralSettings(
  values: GeneralSettings,
): { settings: GeneralSettings } | { error: string } {
  const siteName = values.siteName.trim()
  const companyName = values.companyName.trim()
  const tagline = values.tagline.trim()
  const description = values.description.trim()
  const supportEmail = values.supportEmail.trim()
  // A row left completely blank is one the admin added and didn't fill in, not a mistake.
  const socialLinks = values.socialLinks
    .map((link) => ({ label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.label || link.url)

  if (!siteName) return { error: "Site name cannot be empty." }
  if (siteName.length > SITE_NAME_MAX_LENGTH) {
    return { error: `Site name must be at most ${SITE_NAME_MAX_LENGTH} characters.` }
  }
  if (companyName.length > COMPANY_NAME_MAX_LENGTH) {
    return { error: `Company name must be at most ${COMPANY_NAME_MAX_LENGTH} characters.` }
  }
  if (!tagline) return { error: "Tagline cannot be empty." }
  if (tagline.length > TAGLINE_MAX_LENGTH) {
    return { error: `Tagline must be at most ${TAGLINE_MAX_LENGTH} characters.` }
  }
  if (!description) return { error: "Description cannot be empty." }
  if (description.length > DESCRIPTION_MAX_LENGTH) {
    return { error: `Description must be at most ${DESCRIPTION_MAX_LENGTH} characters.` }
  }
  if (!EMAIL_PATTERN.test(supportEmail) || supportEmail.length > SUPPORT_EMAIL_MAX_LENGTH) {
    return { error: "Support email must be a valid email address." }
  }
  if (socialLinks.length > SOCIAL_LINKS_MAX_COUNT) {
    return { error: `Add at most ${SOCIAL_LINKS_MAX_COUNT} social links.` }
  }
  for (const link of socialLinks) {
    const error = toSocialLinkError(link)
    if (error) return { error }
  }

  return { settings: { siteName, companyName, tagline, description, supportEmail, socialLinks } }
}

function toSocialLinkError({ label, url }: SocialLink): string | null {
  if (!label) return `Give the link to ${url} a label.`
  if (label.length > SOCIAL_LINK_LABEL_MAX_LENGTH) {
    return `Link labels must be at most ${SOCIAL_LINK_LABEL_MAX_LENGTH} characters.`
  }
  if (!isWebUrl(url)) return `The ${label} link must be a URL starting with https://.`
  if (url.length > CONFIG_URL_MAX_LENGTH) {
    return `The ${label} link must be at most ${CONFIG_URL_MAX_LENGTH} characters.`
  }
  return null
}

export function isWebUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

export function toHomeSettings(
  values: HomeSettings,
): { settings: HomeSettings } | { error: string } {
  // Blank lines would only add space, so a line break is the most the headline keeps.
  const headline = values.headline
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
  const subtitle = values.subtitle.trim()
  const stats = values.stats
    .map((stat) => ({ value: stat.value.trim(), label: stat.label.trim() }))
    .filter((stat) => stat.value || stat.label)

  const error =
    toTextError(headline, "Headline", HERO_HEADLINE_MAX_LENGTH) ??
    toTextError(subtitle, "Subtitle", HERO_SUBTITLE_MAX_LENGTH) ??
    (stats.length > HERO_STATS_MAX_COUNT ? `Add at most ${HERO_STATS_MAX_COUNT} stats.` : null) ??
    stats.map(toHeroStatError).find(Boolean)
  if (error) return { error }

  return { settings: { headline, subtitle, stats } }
}

function toHeroStatError({ value, label }: HeroStat): string | null {
  if (!value) return `Give the "${label}" stat a number.`
  if (!label) return `Give the ${value} stat a label.`
  return (
    toTextError(value, "A stat's number", HERO_STAT_VALUE_MAX_LENGTH) ??
    toTextError(label, "A stat's label", HERO_STAT_LABEL_MAX_LENGTH)
  )
}

export function toPricingSettings(
  values: PricingSettings,
): { settings: PricingSettings } | { error: string } {
  const settings: PricingSettings = {
    planName: values.planName.trim(),
    monthlyPlanName: values.monthlyPlanName.trim(),
    yearlyPlanName: values.yearlyPlanName.trim(),
    monthlyTagline: values.monthlyTagline.trim(),
    yearlyTagline: values.yearlyTagline.trim(),
    benefits: toListItems(values.benefits),
    freePlanName: values.freePlanName.trim(),
    freePlanTagline: values.freePlanTagline.trim(),
    freePlanBenefits: toListItems(values.freePlanBenefits),
    trialEnabled: values.trialEnabled === true,
    trialDays: values.trialDays,
    eyebrow: values.eyebrow.trim(),
    headline: values.headline.trim(),
    subtitle: values.subtitle.trim(),
    faq: values.faq
      .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
      .filter((item) => item.question || item.answer),
  }

  const error =
    (settings.planName.length > PLAN_NAME_MAX_LENGTH
      ? `Plan name must be at most ${PLAN_NAME_MAX_LENGTH} characters.`
      : null) ??
    toTextError(settings.monthlyPlanName, "Monthly plan name", PLAN_NAME_MAX_LENGTH) ??
    toTextError(settings.yearlyPlanName, "Yearly plan name", PLAN_NAME_MAX_LENGTH) ??
    toTextError(settings.monthlyTagline, "Monthly plan tagline", PLAN_TAGLINE_MAX_LENGTH) ??
    toTextError(settings.yearlyTagline, "Yearly plan tagline", PLAN_TAGLINE_MAX_LENGTH) ??
    toListError(settings.benefits, "paid plan benefits") ??
    toTextError(settings.freePlanName, "Free plan name", PLAN_NAME_MAX_LENGTH) ??
    toTextError(settings.freePlanTagline, "Free plan tagline", PLAN_TAGLINE_MAX_LENGTH) ??
    toListError(settings.freePlanBenefits, "free plan benefits") ??
    (Number.isInteger(settings.trialDays) &&
    settings.trialDays >= 1 &&
    settings.trialDays <= TRIAL_DAYS_MAX
      ? null
      : `Trial length must be a whole number of days from 1 to ${TRIAL_DAYS_MAX}.`) ??
    toTextError(settings.eyebrow, "Eyebrow", PRICING_EYEBROW_MAX_LENGTH) ??
    toTextError(settings.headline, "Headline", PRICING_HEADLINE_MAX_LENGTH) ??
    toTextError(settings.subtitle, "Subtitle", PRICING_SUBTITLE_MAX_LENGTH) ??
    (settings.faq.length > FAQ_MAX_COUNT ? `Add at most ${FAQ_MAX_COUNT} questions.` : null) ??
    settings.faq.map(toFaqItemError).find(Boolean)
  if (error) return { error }

  return { settings }
}

function toFaqItemError({ question, answer }: FaqItem): string | null {
  if (!question) return `Give the answer "${answer.slice(0, 40)}…" a question.`
  if (!answer) return `Answer "${question}", or remove it.`
  return (
    toTextError(question, "A question", FAQ_QUESTION_MAX_LENGTH) ??
    toTextError(answer, "An answer", FAQ_ANSWER_MAX_LENGTH)
  )
}

/** A row left blank is one the admin added and didn't fill in, not a mistake. */
function toListItems(items: string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean)
}

function toListError(items: string[], name: string): string | null {
  if (!items.length) return `List at least one of the ${name}.`
  if (items.length > PLAN_BENEFITS_MAX_COUNT) {
    return `List at most ${PLAN_BENEFITS_MAX_COUNT} ${name}.`
  }
  return items.some((item) => item.length > PLAN_BENEFIT_MAX_LENGTH)
    ? `Each of the ${name} must be at most ${PLAN_BENEFIT_MAX_LENGTH} characters.`
    : null
}

export function toLegalSettings(
  values: LegalSettings,
): { settings: LegalSettings } | { error: string } {
  const termsOfService = values.termsOfService.trim()
  const privacyPolicy = values.privacyPolicy.trim()

  const error =
    toTextError(termsOfService, "Terms of Service", LEGAL_DOCUMENT_MAX_LENGTH) ??
    toTextError(privacyPolicy, "Privacy Policy", LEGAL_DOCUMENT_MAX_LENGTH)
  if (error) return { error }

  return { settings: { termsOfService, privacyPolicy } }
}

function toTextError(value: string, name: string, maxLength: number): string | null {
  if (!value) return `${name} cannot be empty.`
  return value.length > maxLength ? `${name} must be at most ${maxLength} characters.` : null
}
