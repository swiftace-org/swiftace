import { existsSync } from "node:fs"

import { DEFAULT_AI_TUTOR_SYSTEM_PROMPT } from "@/lib/config"
import type { SiteConfig } from "@/types/site-config"

// For development only, and never overrides a variable that's already set. The production build
// drops it: the binary is configured by its environment alone, wherever it's run from.
if (!import.meta.env?.PROD && existsSync(".env")) process.loadEnvFile(".env")

function ensureServerEnv(key: string) {
  const value = process.env[key]
  if (value) return value
  throw new Error(`'${key}' enviroment variable is not set`)
}

export const NODE_ENV = process.env.NODE_ENV

export const DATABASE_URL = ensureServerEnv("DATABASE_URL")

export const JWT_SECRET_KEY = ensureServerEnv("JWT_SECRET_KEY")
export const HASH_SECRET_KEY = ensureServerEnv("HASH_SECRET_KEY")
export const AWS_ACCESS_KEY_ID = ensureServerEnv("AWS_ACCESS_KEY_ID")
export const AWS_ACCESS_KEY_SECRET = ensureServerEnv("AWS_ACCESS_KEY_SECRET")
export const AWS_REGION = ensureServerEnv("AWS_REGION")
export const EMAIL_DOMAIN = ensureServerEnv("EMAIL_DOMAIN")
export const NOTIFICATION_EMAIL_ADDRESS = `notify@${EMAIL_DOMAIN}`

export const R2_ENDPOINT_URL = ensureServerEnv("R2_ENDPOINT_URL")
export const R2_ACCESS_KEY_ID = ensureServerEnv("R2_ACCESS_KEY_ID")
export const R2_SECRET_ACCESS_KEY = ensureServerEnv("R2_SECRET_ACCESS_KEY")
export const R2_BUCKET = ensureServerEnv("R2_BUCKET")

/** The notebook preview's public URL, on an origin of its own; `swiftace start` serves it. */
export const NOTEBOOK_PREVIEW_URL = ensureServerEnv("NOTEBOOK_PREVIEW_URL").replace(/\/+$/, "")

/** What a fresh deployment shows until an admin saves `/manage/config`. */
export const DEFAULT_SITE_CONFIG: SiteConfig = {
  general: {
    siteName: "Academy",
    companyName: "",
    tagline: "Practical Online Courses",
    description:
      "Learn practical skills and build real-world projects with hands-on online courses.",
    supportEmail: `support@${EMAIL_DOMAIN}`,
    socialLinks: [],
  },
  branding: {
    icon: "",
    favicon: "",
    logoLight: "",
    logoDark: "",
    socialImage: "",
    courseCover: "",
    aiTutorAvatar: "",
  },
  home: {
    headline: "Hands-On Courses\nfor Practical Skills",
    subtitle: "Learn practical skills, build real-world projects, and earn certificates",
    stats: [],
  },
  pricing: {
    planName: "",
    monthlyPlanName: "Pro Monthly",
    yearlyPlanName: "Pro Yearly",
    monthlyTagline: "Full access, with the flexibility of monthly billing.",
    yearlyTagline: "Build a lasting learning habit at our best price.",
    benefits: [
      "Unlimited access to every course",
      "Quizzes to put your skills to the test",
      "Hands-on assignments and projects",
      "Personal feedback on your work",
      "Certificates to showcase your skills",
    ],
    freePlanName: "Free",
    freePlanTagline: "Find your starting point and learn something new.",
    freePlanBenefits: [
      "Browse every course",
      "Enroll in any free course",
      "Preview lessons from paid courses",
    ],
    trialEnabled: false,
    trialDays: 7,
    eyebrow: "Simple plans. Real progress.",
    headline: "Skill up and make your next move",
    subtitle:
      "Go from following tutorials to building things yourself. Get every course, hands-on practice, and feedback with one subscription.",
    faq: [
      {
        question: "Do both plans include every course?",
        answer:
          "Yes. Monthly and yearly plans include the same courses, quizzes, assignments, project feedback, and certificates. Just choose the billing schedule that suits you.",
      },
      {
        question: "Can I learn for free?",
        answer:
          "Absolutely. Browse the catalog, enroll in free courses, and preview selected lessons from paid courses. You don’t need a subscription to get started.",
      },
      {
        question: "Can I change or cancel my plan?",
        answer:
          "Manage your billing, switch plans, or cancel from your account settings. Your saved progress, submitted projects, and earned certificates stay with your account.",
      },
    ],
  },
  legal: {
    termsOfService:
      "# Terms of Service\n\nThe terms of service for {{SITE_NAME}} haven't been published yet. Please write to {{SUPPORT_EMAIL}} with any questions.\n",
    privacyPolicy:
      "# Privacy Policy\n\nThe privacy policy for {{SITE_NAME}} hasn't been published yet. Please write to {{SUPPORT_EMAIL}} with any questions about your data.\n",
  },
  integrations: {
    googleLogin: { enabled: false, clientId: "", clientSecret: "" },
    githubLogin: { enabled: false, clientId: "", clientSecret: "" },
    billing: {
      enabled: false,
      stripeSecretKey: "",
      stripeWebhookSecret: "",
      monthlyPriceId: "",
      annualPriceId: "",
    },
    turnstile: { enabled: false, siteKey: "", secretKey: "" },
    posthog: { enabled: false, projectToken: "", host: "https://us.i.posthog.com" },
    openai: { enabled: false, apiKey: "" },
  },
  aiTutor: {
    enabled: false,
    name: "AI Tutor",
    systemPrompt: DEFAULT_AI_TUTOR_SYSTEM_PROMPT,
    plans: {
      free: {
        enabled: true,
        model: "gpt-6.1-terra",
        reasoningEffort: "low",
        sessionLimitUsd: 0.1,
        weeklyLimitUsd: 0.5,
      },
      pro: {
        enabled: true,
        model: "gpt-6.1-terra",
        reasoningEffort: "medium",
        sessionLimitUsd: 1,
        weeklyLimitUsd: 5,
      },
    },
    // OpenAI's list prices as of November 2026; edited on `/manage/ai-tutor` when they change.
    models: [
      { id: "gpt-6.1-terra", inputPerMillion: 1, cachedInputPerMillion: 0.05, outputPerMillion: 5 },
      { id: "gpt-6.1-sol", inputPerMillion: 2, cachedInputPerMillion: 0.1, outputPerMillion: 10 },
      {
        id: "gpt-6-luna",
        inputPerMillion: 0.1,
        cachedInputPerMillion: 0.01,
        outputPerMillion: 0.5,
      },
      { id: "gpt-6-astra", inputPerMillion: 10, cachedInputPerMillion: 1, outputPerMillion: 50 },
    ],
  },
}
