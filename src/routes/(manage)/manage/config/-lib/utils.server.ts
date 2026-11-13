import type { BrandAsset, Integration, IntegrationSettings } from "@/types/site-config"

import type { BrandImageType } from "../../../../brand/-lib/constants"
import {
  BRAND_ASSET_DETAILS,
  CONFIG_URL_MAX_LENGTH,
  ICON_MIN_SIZE,
  INTEGRATION_DETAILS,
  INTEGRATION_KEY_MAX_LENGTH,
  INTEGRATION_ORDER,
  type IntegrationFieldDetail,
} from "./constants"
import { isWebUrl } from "./utils"

/** `IntegrationSettings` indexed by name, for the loops below that walk `INTEGRATION_DETAILS`. */
type SettingsRecord = Record<Integration, Record<string, string | boolean>>

function toFieldEntries(integration: Integration): [string, IntegrationFieldDetail][] {
  return Object.entries(INTEGRATION_DETAILS[integration].fields)
}

/** What the Integrations tab loads: every secret blanked, and the names of the ones saved. */
export function toAdminIntegrationSettings(settings: IntegrationSettings): {
  integrations: IntegrationSettings
  savedSecrets: string[]
} {
  const stored = settings as unknown as SettingsRecord
  const integrations = structuredClone(stored)
  const savedSecrets: string[] = []

  for (const integration of INTEGRATION_ORDER) {
    for (const [key, field] of toFieldEntries(integration)) {
      if (!field.secret) continue
      if (stored[integration][key]) savedSecrets.push(`${integration}.${key}`)
      integrations[integration][key] = ""
    }
  }
  return { integrations: integrations as unknown as IntegrationSettings, savedSecrets }
}

/**
 * The submitted form over what's stored: a secret left blank keeps its saved value, since the
 * page never had it. Every field is required while its switch is on; turning one off always works.
 */
export function toIntegrationSettings(
  values: Partial<IntegrationSettings>,
  stored: IntegrationSettings,
  siteOrigin?: string,
): { settings: IntegrationSettings } | { error: string } {
  const submitted = values as unknown as Partial<SettingsRecord>
  const saved = stored as unknown as SettingsRecord
  const settings = {} as SettingsRecord

  for (const integration of INTEGRATION_ORDER) {
    const { title } = INTEGRATION_DETAILS[integration]
    const input = submitted[integration] ?? saved[integration]
    const enabled = input.enabled === true
    settings[integration] = { enabled }

    for (const [key, field] of toFieldEntries(integration)) {
      let value = typeof input[key] === "string" ? input[key].trim() : ""
      if (field.url) value = value.replace(/\/+$/, "")
      if (!value && field.secret) value = String(saved[integration][key] ?? "")
      settings[integration][key] = value

      const name = `${title}'s ${field.label}`
      if (enabled && !value) {
        return { error: `Enter the ${field.label} for ${title} before turning it on.` }
      }
      if (!value) continue
      if (value.length > (field.url ? CONFIG_URL_MAX_LENGTH : INTEGRATION_KEY_MAX_LENGTH)) {
        return { error: `${name} is too long.` }
      }
      const localHttp =
        field.url &&
        field.allowLocalHttp &&
        (() => {
          try {
            const url = new URL(value)
            return (
              url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
            )
          } catch {
            return false
          }
        })()
      if (field.url && !isWebUrl(value) && !localHttp) {
        return { error: `${name} must be a URL starting with https://.` }
      }
      if (field.url) {
        const url = new URL(value)
        if (url.username || url.password) return { error: `${name} must not contain credentials.` }
        if (enabled && integration === "notebookPreview" && url.origin === siteOrigin) {
          return { error: "The preview URL must use a separate origin from the site." }
        }
      }
      if (field.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)) {
        return { error: `${name} must be a valid email address.` }
      }
      if (field.prefixes && !field.prefixes.some((prefix) => value.startsWith(prefix))) {
        return { error: `${name} should start with ${field.prefixes.join(" or ")}.` }
      }
    }
  }

  return { settings: settings as unknown as IntegrationSettings }
}

/**
 * What a file really is, from its first bytes rather than its name or the browser's guess, since
 * that decides the `Content-Type` it's served with.
 */
export function detectBrandImageType(bytes: Uint8Array): BrandImageType | null {
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end))
  if (bytes[0] === 0x89 && ascii(1, 4) === "PNG") return "png"
  if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) return "ico"
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg"
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp"
  // An SVG may open with a BOM, an XML declaration or a comment, so look a little further in.
  if (/<svg[\s>]/i.test(new TextDecoder().decode(bytes.subarray(0, 4096)))) return "svg"
  return null
}

export async function toBrandAssetError(
  asset: BrandAsset,
  bytes: Uint8Array,
  type: BrandImageType | null,
): Promise<string | null> {
  const { title, types, maxBytes } = BRAND_ASSET_DETAILS[asset]
  if (bytes.length > maxBytes) {
    return `The ${title.toLowerCase()} must be at most ${maxBytes / (1024 * 1024)} MB.`
  }
  if (!type || !types.includes(type)) {
    return `The ${title.toLowerCase()} must be ${formatTypes(types)}.`
  }
  if (type === "ico") {
    return isValidIco(bytes)
      ? null
      : "That .ico couldn't be read. Please export it again and retry."
  }
  if (asset !== "icon") return null

  const { Jimp } = await import("jimp")
  let width: number
  let height: number
  try {
    ;({ width, height } = (await Jimp.read(Buffer.from(bytes))).bitmap)
  } catch {
    return "That PNG couldn't be read. Please export it again and retry."
  }
  if (width !== height) return `The icon must be square, not ${width} × ${height}.`
  if (width < ICON_MIN_SIZE) {
    return `The icon must be at least ${ICON_MIN_SIZE} × ${ICON_MIN_SIZE} pixels, not ${width} × ${height}.`
  }
  return null
}

/** Every directory entry has to point at image data inside the file, or browsers show nothing. */
function isValidIco(bytes: Uint8Array): boolean {
  if (bytes.length < 6) return false
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = view.getUint16(4, true)
  if (!count || bytes.length < 6 + 16 * count) return false
  for (let index = 0; index < count; index++) {
    const entry = 6 + 16 * index
    const size = view.getUint32(entry + 8, true)
    const offset = view.getUint32(entry + 12, true)
    if (!size || offset + size > bytes.length) return false
  }
  return true
}

function formatTypes(types: BrandImageType[]): string {
  const names = types.map((type) =>
    type === "jpg"
      ? "JPEG"
      : type === "webp"
        ? "WebP"
        : type === "ico"
          ? ".ico"
          : type.toUpperCase(),
  )
  return names.length === 1
    ? `${names[0] === ".ico" ? "an" : "a"} ${names[0]}`
    : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`
}
