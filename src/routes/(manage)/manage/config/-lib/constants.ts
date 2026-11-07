import type {
  BrandAsset,
  Integration,
  IntegrationSettings,
  SiteConfigSection,
  ManageConfigTab,
} from "@/types/site-config"

import type { BrandImageType } from "../../../../brand/-lib/constants"

export const MANAGE_CONFIG_TABS: { value: ManageConfigTab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "branding", label: "Branding" },
  { value: "home", label: "Home Page" },
  { value: "pricing", label: "Pricing" },
  { value: "legal", label: "Legal" },
  { value: "integrations", label: "Integrations" },
  { value: "notebookPreview", label: "Jupyter output preview" },
]

export const DEFAULT_MANAGE_CONFIG_TAB: SiteConfigSection = "general"

export const SITE_NAME_MAX_LENGTH = 60
export const COMPANY_NAME_MAX_LENGTH = 120
export const TAGLINE_MAX_LENGTH = 120
export const DESCRIPTION_MAX_LENGTH = 400
export const SUPPORT_EMAIL_MAX_LENGTH = 254

export const SOCIAL_LINKS_MAX_COUNT = 8
export const SOCIAL_LINK_LABEL_MAX_LENGTH = 40
export const CONFIG_URL_MAX_LENGTH = 500
export const INTEGRATION_KEY_MAX_LENGTH = 200

export const HERO_HEADLINE_MAX_LENGTH = 80
export const HERO_SUBTITLE_MAX_LENGTH = 200
/** The hero's layout has room for three, side by side on phones. */
export const HERO_STATS_MAX_COUNT = 3
export const HERO_STAT_VALUE_MAX_LENGTH = 12
export const HERO_STAT_LABEL_MAX_LENGTH = 40

export const PLAN_NAME_MAX_LENGTH = 40
export const PLAN_TAGLINE_MAX_LENGTH = 120
export const PLAN_BENEFITS_MAX_COUNT = 10
export const PLAN_BENEFIT_MAX_LENGTH = 100
/** Stripe accepts up to two years, but a trial that long is surely a typo. */
export const TRIAL_DAYS_MAX = 90
export const PRICING_EYEBROW_MAX_LENGTH = 60
export const PRICING_HEADLINE_MAX_LENGTH = 80
export const PRICING_SUBTITLE_MAX_LENGTH = 300
export const FAQ_MAX_COUNT = 12
export const FAQ_QUESTION_MAX_LENGTH = 150
export const FAQ_ANSWER_MAX_LENGTH = 1000

export const LEGAL_DOCUMENT_MAX_LENGTH = 100_000

/** One input on the Integrations tab. Every field is required while its switch is on. */
export type IntegrationFieldDetail = {
  label: string
  /** Write-only: the page shows whether it's saved, never what it is. */
  secret?: boolean
  url?: boolean
  email?: boolean
  allowLocalHttp?: boolean
  placeholder?: string
  /** What the value must start with, which catches a key pasted into the wrong box. */
  prefixes?: string[]
}

type IntegrationDetail<I extends Integration> = {
  title: string
  /** Takes the site's origin, since a few providers need a callback URL registered with them. */
  describe: (origin: string) => string
  /** Keyed by every setting but `enabled`, so a field added to the type can't be left out here. */
  fields: { [K in Exclude<keyof IntegrationSettings[I], "enabled">]: IntegrationFieldDetail }
}

export const INTEGRATION_DETAILS: { [I in Integration]: IntegrationDetail<I> } = {
  email: {
    title: "Email (AWS SES)",
    describe: () =>
      "Sends sign-in codes and notifications using Amazon SES. Verify the sender address or its domain in SES. Turning this off disables email sign-in and outgoing notifications.",
    fields: {
      region: { label: "AWS region", placeholder: "us-east-1" },
      accessKeyId: { label: "Access key ID", secret: true },
      secretAccessKey: { label: "Secret access key", secret: true },
      fromEmail: { label: "Sender email address", email: true, placeholder: "notify@example.com" },
    },
  },
  objectStorage: {
    title: "Object storage (S3 compatible)",
    describe: () =>
      "Stores branding, course images, review photos and certificates in an S3-compatible bucket. Use auto as the region for Cloudflare R2, or your provider's region. Existing files must be copied if you change the bucket or provider.",
    fields: {
      endpoint: {
        label: "Endpoint URL",
        url: true,
        allowLocalHttp: true,
        placeholder: "https://s3.us-east-1.amazonaws.com",
      },
      region: { label: "Region", placeholder: "auto" },
      accessKeyId: { label: "Access key ID", secret: true },
      secretAccessKey: { label: "Secret access key", secret: true },
      bucket: { label: "Bucket" },
    },
  },
  notebookPreview: {
    title: "Jupyter output preview",
    describe: () =>
      "Enables rich iframe previews for interactive notebook outputs such as Plotly charts. Use a separate preview origin with SwiftAce's sandboxed preview server and configure its allowed parent origins. While off, outputs use static or text alternatives.",
    fields: {
      url: {
        label: "Preview URL",
        url: true,
        allowLocalHttp: true,
        placeholder: "https://preview.example.com",
      },
    },
  },
  turnstile: {
    title: "Cloudflare Turnstile",
    describe: () =>
      "Asks for a human check before a login code is sent, so bots can't use the login form to send email.",
    fields: {
      siteKey: { label: "Site key" },
      secretKey: { label: "Secret key", secret: true },
    },
  },
  googleLogin: {
    title: "Google login",
    describe: (origin) =>
      `Adds "Continue with Google" to the login page. The OAuth client's redirect URI is ${origin}/google/auth.`,
    fields: {
      clientId: { label: "Client ID" },
      clientSecret: { label: "Client secret", secret: true },
    },
  },
  githubLogin: {
    title: "GitHub login",
    describe: (origin) =>
      `Adds "Continue with GitHub" to the login page. The OAuth app's callback URL is ${origin}/github/auth.`,
    fields: {
      clientId: { label: "Client ID" },
      clientSecret: { label: "Client secret", secret: true },
    },
  },
  billing: {
    title: "Billing",
    describe: (origin) =>
      `Sells the Pro subscription through Stripe: pricing, checkout, upgrade buttons and the billing portal. Stripe's webhook goes to ${origin}/api/stripe/webhook. While off, paid courses stay locked and admins add participants by hand.`,
    fields: {
      stripeSecretKey: { label: "Stripe secret key", secret: true, prefixes: ["sk_", "rk_"] },
      stripeWebhookSecret: { label: "Webhook signing secret", secret: true, prefixes: ["whsec_"] },
      monthlyPriceId: { label: "Monthly price ID", prefixes: ["price_"] },
      annualPriceId: { label: "Annual price ID", prefixes: ["price_"] },
    },
  },
  posthog: {
    title: "PostHog",
    describe: () => "Records page views, events and errors from the browser and the server.",
    fields: {
      projectToken: { label: "Project token", prefixes: ["phc_"] },
      host: { label: "Host", url: true, placeholder: "https://us.i.posthog.com" },
    },
  },
  openai: {
    title: "OpenAI",
    describe: (origin) =>
      `Powers the AI tutor in the course pages. Its name, prompt, models and usage limits are set at ${origin}/manage/ai-tutor.`,
    fields: {
      apiKey: { label: "API key", secret: true, prefixes: ["sk-"] },
    },
  },
}

/** The order the Integrations tab lists them in. */
export const INTEGRATION_ORDER: Integration[] = [
  "email",
  "objectStorage",
  "turnstile",
  "googleLogin",
  "githubLogin",
  "billing",
  "posthog",
  "openai",
  "notebookPreview",
]

const MB = 1024 * 1024

/** One image on the Branding tab, which uploads as soon as a file is picked. */
export type BrandAssetDetail = {
  title: string
  description: string
  types: BrandImageType[]
  maxBytes: number
  /** How the preview is framed, and what it sits on so a white or dark logo stays visible. */
  preview: "icon" | "logo-light" | "logo-dark" | "wide"
}

/** In the order the Branding tab lists them. */
export const BRAND_ASSET_DETAILS: Record<BrandAsset, BrandAssetDetail> = {
  icon: {
    title: "Icon",
    description:
      "A square PNG of at least 512 × 512 pixels. Becomes the favicon, the app and home-screen icons and the email header, and stands in for the logo until one is uploaded.",
    types: ["png"],
    maxBytes: 2 * MB,
    preview: "icon",
  },
  favicon: {
    title: "Favicon",
    description:
      "Optional: an .ico for browser tabs, if a hand-tuned one reads better at 16 pixels than the icon scaled down. Without one, the favicon is built from the icon.",
    types: ["ico"],
    maxBytes: 1 * MB,
    preview: "icon",
  },
  logoLight: {
    title: "Logo",
    description:
      "The wide logo for the navbar, on a light background. SVG, PNG or WebP, shown 24–32 pixels tall.",
    types: ["svg", "png", "webp"],
    maxBytes: 1 * MB,
    preview: "logo-light",
  },
  logoDark: {
    title: "Logo for dark mode",
    description: "The same logo, for a dark background. Without one, the light logo is used.",
    types: ["svg", "png", "webp"],
    maxBytes: 1 * MB,
    preview: "logo-dark",
  },
  socialImage: {
    title: "Social preview image",
    description:
      "Shown when a page without its own image is shared on social media or in chat. PNG or JPEG, ideally 1200 × 630 pixels.",
    types: ["png", "jpg"],
    maxBytes: 5 * MB,
    preview: "wide",
  },
  courseCover: {
    title: "Default course cover",
    description: "For courses without a cover of their own. 16:9, as PNG, JPEG, WebP or SVG.",
    types: ["png", "jpg", "webp", "svg"],
    maxBytes: 2 * MB,
    preview: "wide",
  },
  aiTutorAvatar: {
    title: "Avatar",
    description:
      "A square PNG, JPEG, WebP or SVG, shown in the tutor's panel and beside its replies. Without one, an icon stands in.",
    types: ["png", "jpg", "webp", "svg"],
    maxBytes: 1 * MB,
    preview: "icon",
  },
}

/** Uploaded from `/manage/ai-tutor` instead, beside the rest of the tutor's settings. */
export const BRANDING_TAB_ASSETS = (Object.keys(BRAND_ASSET_DETAILS) as BrandAsset[]).filter(
  (asset) => asset !== "aiTutorAvatar",
)

export const ICON_MIN_SIZE = 512
