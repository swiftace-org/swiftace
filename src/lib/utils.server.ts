import crypto from "node:crypto"

import { DeleteObjectsCommand, S3Client } from "@aws-sdk/client-s3"
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2"
import { render, toPlainText } from "@react-email/render"
import { deleteCookie, getCookie, getRequestUrl } from "@tanstack/react-start/server"
import jwt from "jsonwebtoken"
import { PostHog } from "posthog-node"
import type { ReactElement } from "react"

import { AUTH_COOKIE_NAME, DEFAULT_COURSE_COVER_PATH } from "@/lib/config"
import { DEFAULT_SITE_CONFIG, JWT_SECRET_KEY } from "@/lib/config.server"
import type { Account, JWTPayload } from "@/types/account"
import type { AiTutorModel } from "@/types/ai-tutor"
import type { AnalyticsEvent } from "@/types/analytics"
import type { EmailAttachment } from "@/types/common"
import type {
  EmailBrand,
  FaqItem,
  HeroStat,
  IntegrationSettings,
  PublicSiteConfig,
  SiteConfig,
  SocialLink,
} from "@/types/site-config"

import { toBrandAssetUrl } from "../routes/brand/-lib/utils"
import {
  readAccountById,
  readActiveSubscriptionByAccountId,
  readCourseBySlug,
  readCourseEnrollment,
  readSiteConfigRows,
} from "./db.server"

/**
 * This app's public origin, for the verification email's link and the OAuth redirect URIs.
 *
 * Taken from the `Host` header, which the client sets — a forged `Host: evil.tld` would put a
 * live magic-link token into a real email pointing at the attacker. What prevents that is the
 * reverse proxy, not this code: Caddy only routes a request whose `Host` matches the site
 * address — **so that site address must be a concrete hostname.** If it becomes `:443`, a
 * wildcard, gains `on_demand_tls`, or another proxy fronts the app without the same check, pin
 * the origin to a fixed value here instead. The README's deployment notes say the same.
 */
export function getSiteUrl(): string {
  return getRequestUrl().origin
}

export function generateToken(): string {
  return crypto.randomUUID()
}

export function clearAuthCookie(): void {
  deleteCookie(AUTH_COOKIE_NAME, { path: "/" })
}

/** The signed-in account's id straight from the cookie, without reading the account row. */
export function getCurrentAccountId(): number | null {
  const token = getCookie(AUTH_COOKIE_NAME)
  if (!token) return null

  try {
    return (jwt.verify(token, JWT_SECRET_KEY) as JWTPayload).accountId
  } catch {
    return null
  }
}

export async function getCurrentAccount(): Promise<Account | null> {
  const accountId = getCurrentAccountId()
  return accountId ? readAccountById(accountId) : null
}

export type CourseForViewer = {
  course: NonNullable<Awaited<ReturnType<typeof readCourseBySlug>>>
  account: Account | null
  /** Admins see DRAFT sections and can open sections a learner can't. */
  isAdmin: boolean
  /** Decides both what a paid course unlocks and what progress is recorded against. */
  isEnrolled: boolean
}

/**
 * A course by slug for a public request, or null when this caller may not see it: `PUBLIC` and
 * `SECRET` are readable by anyone, `PRIVATE` (and the legacy NULL) needs an admin or enrollment.
 * Null rather than "forbidden", so the 404 doesn't confirm a private course exists.
 *
 * Enrollment is resolved here rather than by each caller, because every page that gates content
 * needs it — see `isSectionLocked`.
 */
export async function readCourseForViewer(courseSlug: string): Promise<CourseForViewer | null> {
  const course = await readCourseBySlug(courseSlug)
  if (!course) return null

  const account = await getCurrentAccount()
  const isEnrolled = account ? !!(await readCourseEnrollment(course.id, account.id)) : false

  if (account?.isAdmin) return { course, account, isAdmin: true, isEnrolled }

  if (course.visibility === "PUBLIC" || course.visibility === "SECRET") {
    return { course, account, isAdmin: false, isEnrolled }
  }

  return isEnrolled ? { course, account, isAdmin: false, isEnrolled } : null
}

export async function readHasActiveSubscription(accountId: number): Promise<boolean> {
  return !!(await readActiveSubscriptionByAccountId(accountId))
}

/** Long enough to spare the database a read per request; saving the page clears it at once. */
const SITE_CONFIG_TTL_MS = 60 * 1000

let siteConfigCache: { promise: Promise<SiteConfig>; expiresAt: number } | undefined

/**
 * `/manage/config` over its defaults, shared by every request in this process — secrets and all,
 * so it never goes to the browser as is; see `toPublicSiteConfig`. The minute's
 * expiry is only for edits this process didn't make, like a hand-run UPDATE.
 */
export function getSiteConfig(): Promise<SiteConfig> {
  if (siteConfigCache && siteConfigCache.expiresAt > Date.now()) return siteConfigCache.promise

  const promise = readSiteConfigRows().then(toSiteConfig)
  siteConfigCache = { promise, expiresAt: Date.now() + SITE_CONFIG_TTL_MS }
  // A failed read retries on the next request rather than failing every page for a minute.
  promise.catch(() => {
    if (siteConfigCache?.promise === promise) siteConfigCache = undefined
  })
  return promise
}

export function clearSiteConfigCache(): void {
  siteConfigCache = undefined
}

/**
 * What pages may see. Built field by field rather than by omitting the secrets, so a setting
 * added later stays on the server until it's deliberately listed here.
 */
export function toPublicSiteConfig({
  general,
  branding,
  home,
  pricing,
  integrations,
  aiTutor,
}: SiteConfig): PublicSiteConfig {
  const { googleLogin, githubLogin, billing, turnstile, posthog, openai, notebookPreview } =
    integrations
  const iconVersion = toBrandAssetVersion(branding.icon)
  const logoLightUrl = toBrandAssetUrl(branding.logoLight)
  return {
    general,
    branding: {
      iconUrl: `/icon-192.png?v=${iconVersion}`,
      logoLightUrl,
      logoDarkUrl: toBrandAssetUrl(branding.logoDark) || logoLightUrl,
      socialImageUrl: toBrandAssetUrl(branding.socialImage),
      courseCoverUrl: toBrandAssetUrl(branding.courseCover) || DEFAULT_COURSE_COVER_PATH,
      iconVersion,
      faviconVersion: branding.favicon ? toBrandAssetVersion(branding.favicon) : iconVersion,
    },
    home,
    pricing,
    integrations: {
      googleLogin: { enabled: googleLogin.enabled },
      githubLogin: { enabled: githubLogin.enabled },
      billing: { enabled: billing.enabled },
      turnstile: { enabled: turnstile.enabled, siteKey: turnstile.siteKey },
      posthog: { enabled: posthog.enabled, projectToken: posthog.projectToken, host: posthog.host },
    },
    aiTutor: {
      enabled: aiTutor.enabled && openai.enabled,
      name: aiTutor.name,
      avatarUrl: toBrandAssetUrl(branding.aiTutorAvatar),
    },
    notebookPreview: {
      enabled: notebookPreview.enabled,
      url: notebookPreview.enabled ? notebookPreview.url : "",
    },
  }
}

/** The content hash already in the key, e.g. `brand/icon-3fa9c2e1b07d.png` → `3fa9c2e1b07d`. */
function toBrandAssetVersion(key: string): string {
  return key.match(/-([0-9a-f]+)\.\w+$/)?.[1] ?? "default"
}

/**
 * Saving can't switch an integration on with a blank field, but a hand-edited row can, and
 * this makes that fail loudly at the call rather than as a confusing rejection from the provider.
 */
export function requireIntegrationSetting(value: string, name: string): string {
  if (value) return value
  throw new Error(`${name} isn't set in /manage/config.`)
}

function toSiteConfig(rows: { section: string; data: unknown }[]): SiteConfig {
  const stored = Object.fromEntries(rows.map((row) => [row.section, row.data]))
  const general = mergeOverDefaults(DEFAULT_SITE_CONFIG.general, stored.general)
  const home = mergeOverDefaults(DEFAULT_SITE_CONFIG.home, stored.home)
  const pricing = mergeOverDefaults(DEFAULT_SITE_CONFIG.pricing, stored.pricing)
  const aiTutor = mergeOverDefaults(DEFAULT_SITE_CONFIG.aiTutor, stored.aiTutor)

  return {
    general: { ...general, socialLinks: general.socialLinks.filter(isSocialLink) },
    branding: mergeOverDefaults(DEFAULT_SITE_CONFIG.branding, stored.branding),
    home: { ...home, stats: home.stats.filter(isHeroStat) },
    pricing: {
      ...pricing,
      benefits: pricing.benefits.filter(isString),
      freePlanBenefits: pricing.freePlanBenefits.filter(isString),
      faq: pricing.faq.filter(isFaqItem),
    },
    legal: mergeOverDefaults(DEFAULT_SITE_CONFIG.legal, stored.legal),
    integrations: mergeOverDefaults(DEFAULT_SITE_CONFIG.integrations, stored.integrations),
    aiTutor: { ...aiTutor, models: aiTutor.models.filter(isAiTutorModel) },
  }
}

/**
 * Keeps each stored value only where it has the default's type, so a setting added after a
 * section was saved, or a hand-edited row, reads as its default instead of breaking pages.
 */
function mergeOverDefaults<T>(defaults: T, stored: unknown): T {
  if (Array.isArray(defaults)) return (Array.isArray(stored) ? stored : defaults) as T
  if (isRecord(defaults)) {
    if (!isRecord(stored)) return defaults
    return Object.fromEntries(
      Object.entries(defaults).map(([key, value]) => [key, mergeOverDefaults(value, stored[key])]),
    ) as T
  }
  return (typeof stored === typeof defaults ? stored : defaults) as T
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isSocialLink(value: unknown): value is SocialLink {
  return isRecord(value) && typeof value.label === "string" && typeof value.url === "string"
}

function isHeroStat(value: unknown): value is HeroStat {
  return isRecord(value) && typeof value.value === "string" && typeof value.label === "string"
}

function isFaqItem(value: unknown): value is FaqItem {
  return isRecord(value) && typeof value.question === "string" && typeof value.answer === "string"
}

function isAiTutorModel(value: unknown): value is AiTutorModel {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.inputPerMillion === "number" &&
    typeof value.cachedInputPerMillion === "number" &&
    typeof value.outputPerMillion === "number"
  )
}

function isString(value: unknown): value is string {
  return typeof value === "string"
}

/**
 * What every email's header needs, so a template never reaches for the config itself. The
 * icon goes as a PNG, since Gmail won't show SVGs and some clients stretch a narrow logo.
 */
export async function readEmailBrand(): Promise<EmailBrand> {
  const { general, branding } = toPublicSiteConfig(await getSiteConfig())
  return { siteName: general.siteName, logoUrl: `${getSiteUrl()}${branding.iconUrl}` }
}

let posthogClient: { settings: string; client: PostHog } | undefined

/** Rebuilt when the token or host is changed from `/manage/config`, which no restart follows. */
function getPostHogClient(posthog: IntegrationSettings["posthog"]): PostHog | undefined {
  if (!posthog.enabled) return undefined

  const settings = `${posthog.projectToken} ${posthog.host}`
  if (posthogClient?.settings !== settings) {
    void posthogClient?.client.shutdown()
    // `flushAt: 1` sends each event as it happens, so a restart between batches can't drop any.
    const client = new PostHog(posthog.projectToken, {
      host: posthog.host,
      flushAt: 1,
      flushInterval: 0,
      enableExceptionAutocapture: true,
    })
    posthogClient = { settings, client }
  }
  return posthogClient.client
}

function withPostHogClient(callback: (client: PostHog) => void): void {
  getSiteConfig()
    .then(({ integrations }) => {
      const client = getPostHogClient(integrations.posthog)
      if (client) callback(client)
    })
    .catch((error) => console.error("Failed to read the site config for PostHog.", error))
}

// Created at startup rather than on the first event, so its exception autocapture is on from the start.
withPostHogClient(() => {})

/**
 * Keyed by the id the browser identifies the account by. Server-side so ad blockers can't
 * drop it, and in the background so it can't fail or slow the request.
 */
export function captureEvent(
  accountId: number,
  event: AnalyticsEvent,
  properties?: Record<string, unknown>,
): void {
  withPostHogClient((client) =>
    client.capture({ distinctId: String(accountId), event, properties }),
  )
}

/** Attributed to the signed-in account when there is one, so it lines up with their events. */
export function captureServerException(error: unknown, properties?: Record<string, unknown>): void {
  // Read now: the cookie belongs to this request, which may be over by the time the config is.
  const accountId = getCurrentAccountId()
  withPostHogClient((client) =>
    client.captureException(error, accountId ? String(accountId) : undefined, properties),
  )
}

let storageClientCache:
  | { settings: IntegrationSettings["objectStorage"]; client: S3Client }
  | undefined

export async function getObjectStorage() {
  const { objectStorage: settings } = (await getSiteConfig()).integrations
  if (!settings.enabled)
    throw new Error("Enable object storage in /manage/config before using uploads or certificates.")
  if (storageClientCache?.settings !== settings) {
    storageClientCache = {
      settings,
      client: new S3Client({
        region: requireIntegrationSetting(settings.region, "Object storage region"),
        endpoint: requireIntegrationSetting(settings.endpoint, "Object storage endpoint"),
        forcePathStyle: true,
        credentials: {
          accessKeyId: requireIntegrationSetting(
            settings.accessKeyId,
            "Object storage access key ID",
          ),
          secretAccessKey: requireIntegrationSetting(
            settings.secretAccessKey,
            "Object storage secret access key",
          ),
        },
      }),
    }
  }
  return {
    client: storageClientCache.client,
    bucket: requireIntegrationSetting(settings.bucket, "Object storage bucket"),
  }
}

/** S3 accepts at most 1000 keys per delete request. Missing keys aren't errors. */
export async function deleteStorageObjects(keys: string[]): Promise<void> {
  if (!keys.length) return
  const { client, bucket } = await getObjectStorage()
  for (let start = 0; start < keys.length; start += STORAGE_DELETE_BATCH_SIZE) {
    const batch = keys.slice(start, start + STORAGE_DELETE_BATCH_SIZE)
    const { Errors } = await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    )
    if (Errors?.length) {
      throw new Error(
        `Object storage refused to delete ${Errors.map((error) => error.Key).join(", ")}`,
      )
    }
  }
}

const STORAGE_DELETE_BATCH_SIZE = 1000
let emailClientCache: { settings: IntegrationSettings["email"]; client: SESv2Client } | undefined

/**
 * Every email is sent from a no-reply address, so replies go to the support inbox instead of
 * bouncing. `cc` is how that inbox keeps a copy of the emails it may need to follow up on.
 */
export async function sendSesEmail({
  to,
  cc = [],
  subject,
  reactBody,
  attachments = [],
}: {
  to: string
  cc?: string[]
  subject: string
  reactBody: ReactElement
  attachments?: EmailAttachment[]
}): Promise<{ success: true } | { success: false; error: unknown }> {
  const htmlBody = await render(reactBody)
  const textBody = toPlainText(htmlBody)

  try {
    const {
      general,
      integrations: { email },
    } = await getSiteConfig()
    if (!email.enabled) throw new Error("Enable email in /manage/config before sending email.")
    if (emailClientCache?.settings !== email) {
      emailClientCache = {
        settings: email,
        client: new SESv2Client({
          region: requireIntegrationSetting(email.region, "Email AWS region"),
          credentials: {
            accessKeyId: requireIntegrationSetting(email.accessKeyId, "Email access key ID"),
            secretAccessKey: requireIntegrationSetting(
              email.secretAccessKey,
              "Email secret access key",
            ),
          },
        }),
      }
    }
    await emailClientCache.client.send(
      new SendEmailCommand({
        // The display name is what inboxes list as the sender, in place of the bare address.
        FromEmailAddress: `${toEmailDisplayName(`${general.siteName} Notifications`)} <${requireIntegrationSetting(email.fromEmail, "Sender email address")}>`,
        Destination: { ToAddresses: [to], CcAddresses: cc },
        ReplyToAddresses: general.supportEmail ? [general.supportEmail] : undefined,
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: {
              Html: { Data: htmlBody, Charset: "UTF-8" },
              Text: { Data: textBody, Charset: "UTF-8" },
            },
            Attachments: attachments.map((attachment) => ({
              FileName: attachment.filename,
              ContentType: attachment.contentType,
              RawContent: attachment.content,
              ContentDisposition: "ATTACHMENT",
              ContentTransferEncoding: "BASE64",
            })),
          },
        },
      }),
    )
    return { success: true }
  } catch (error) {
    console.error("Failed to send email:", error)
    return { success: false, error }
  }
}

/**
 * The site name is free text, so it's quoted to keep a comma or `<` from splitting the address,
 * and MIME-encoded when it isn't ASCII, which SES requires of a display name.
 */
function toEmailDisplayName(name: string): string {
  const cleaned = name.replace(/["\\\r\n]/g, "").trim()
  if (/^[\x20-\x7e]*$/.test(cleaned)) return `"${cleaned}"`
  return `=?UTF-8?B?${Buffer.from(cleaned).toString("base64")}?=`
}
