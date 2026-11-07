import type { AiTutorSettings, PublicAiTutorSettings } from "@/types/ai-tutor"

/**
 * Everything a deployment sets from `/manage/config`, secrets included — so this one never leaves
 * the server. Pages get `PublicSiteConfig` instead.
 */
export type SiteConfig = {
  general: GeneralSettings
  branding: BrandingSettings
  home: HomeSettings
  pricing: PricingSettings
  legal: LegalSettings
  integrations: IntegrationSettings
  /** Edited on `/manage/ai-tutor` rather than `/manage/config`. */
  aiTutor: AiTutorSettings
}

/** What rides along with the session to every page: the settings minus every key and secret. */
export type PublicSiteConfig = {
  general: GeneralSettings
  branding: PublicBrandingSettings
  home: HomeSettings
  pricing: PricingSettings
  integrations: PublicIntegrationSettings
  aiTutor: PublicAiTutorSettings
  notebookPreview: IntegrationSettings["notebookPreview"]
}

/** Each section is a row of its own, so saving one can't write back a stale copy of another. */
export type SiteConfigSection = keyof SiteConfig

export type ManageConfigTab = SiteConfigSection | "notebookPreview"

export type GeneralSettings = {
  siteName: string
  /** The footer's copyright holder; blank means the site name. */
  companyName: string
  tagline: string
  description: string
  /** Where support requests go and where every outgoing email's replies land. */
  supportEmail: string
  socialLinks: SocialLink[]
}

export type SocialLink = { label: string; url: string }

/** The R2 key of each uploaded image, blank until one is uploaded. Keys are content-hashed. */
export type BrandingSettings = Record<BrandAsset, string>

export type BrandAsset =
  | "icon"
  | "favicon"
  | "logoLight"
  | "logoDark"
  | "socialImage"
  | "courseCover"
  | "aiTutorAvatar"

/** Ready to render: fallbacks resolved, and every URL changes when its image does. */
export type PublicBrandingSettings = {
  /** A 192px rendition of the icon — what every in-page use of it needs. */
  iconUrl: string
  /** Blank without an uploaded logo, in which case the icon and site name stand in. */
  logoLightUrl: string
  logoDarkUrl: string
  /** Blank without one, so pages without an image of their own share no image at all. */
  socialImageUrl: string
  courseCoverUrl: string
  /** Busts the cache on the fixed-path icon routes, like `/icon-192.png`, when the icon changes. */
  iconVersion: string
  /** The same for `/favicon.ico`, which an uploaded favicon replaces outright. */
  faviconVersion: string
}

/** The landing page's hero, above the course grid. */
export type HomeSettings = {
  /** A line break in it is kept, so the admin decides where a long headline wraps. */
  headline: string
  subtitle: string
  /** Up to three, beside the headline; none hides the column. */
  stats: HeroStat[]
}

export type HeroStat = { value: string; label: string }

/** The pricing page's copy. Prices come from Stripe, so they're not here. */
export type PricingSettings = {
  /** The paid plan's full name; blank means the site name followed by "Pro". */
  planName: string
  /** Shorter than `planName`, so the plan cards fit three to a row. */
  monthlyPlanName: string
  yearlyPlanName: string
  monthlyTagline: string
  yearlyTagline: string
  benefits: string[]
  freePlanName: string
  freePlanTagline: string
  freePlanBenefits: string[]
  /** Only ever a learner's first subscription; `trialDays` is what checkout asks Stripe for. */
  trialEnabled: boolean
  trialDays: number
  eyebrow: string
  headline: string
  subtitle: string
  faq: FaqItem[]
}

export type FaqItem = { question: string; answer: string }

/**
 * Markdown, with `{{SITE_NAME}}` and `{{SUPPORT_EMAIL}}` filled in when shown. Long, and only read
 * by the two pages that render them, so they stay out of `PublicSiteConfig`.
 */
export type LegalSettings = { termsOfService: string; privacyPolicy: string }

/** Each switch is explicit, and can only be turned on once the fields it needs are filled in. */
export type IntegrationSettings = {
  email: {
    enabled: boolean
    region: string
    accessKeyId: string
    secretAccessKey: string
    fromEmail: string
  }
  objectStorage: {
    enabled: boolean
    endpoint: string
    region: string
    accessKeyId: string
    secretAccessKey: string
    bucket: string
  }
  notebookPreview: { enabled: boolean; url: string }
  googleLogin: { enabled: boolean; clientId: string; clientSecret: string }
  githubLogin: { enabled: boolean; clientId: string; clientSecret: string }
  billing: {
    enabled: boolean
    stripeSecretKey: string
    stripeWebhookSecret: string
    /** The two recurring prices learners can subscribe to, both on the same Stripe product. */
    monthlyPriceId: string
    annualPriceId: string
  }
  turnstile: { enabled: boolean; siteKey: string; secretKey: string }
  posthog: { enabled: boolean; projectToken: string; host: string }
  /** Powers the AI tutor, whose own settings are on `/manage/ai-tutor`. */
  openai: { enabled: boolean; apiKey: string }
}

export type Integration = keyof IntegrationSettings

/** The switches, plus the two keys the browser itself needs, both public by design. */
export type PublicIntegrationSettings = {
  googleLogin: { enabled: boolean }
  githubLogin: { enabled: boolean }
  billing: { enabled: boolean }
  turnstile: { enabled: boolean; siteKey: string }
  posthog: { enabled: boolean; projectToken: string; host: string }
}

/** The brand every email template draws its header and copy from. */
export type EmailBrand = { siteName: string; logoUrl: string }

export type ManageConfigPageData = {
  general: GeneralSettings
  branding: BrandingSettings
  home: HomeSettings
  pricing: PricingSettings
  legal: LegalSettings
  /** With every secret blanked; `savedSecrets` names the ones stored, as `integration.field`. */
  integrations: IntegrationSettings
  savedSecrets: string[]
}
