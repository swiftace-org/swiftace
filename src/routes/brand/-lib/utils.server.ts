import crypto from "node:crypto"

import { GetObjectCommand, NoSuchKey, PutObjectCommand } from "@aws-sdk/client-s3"

import { DEFAULT_ICON_PATH } from "@/lib/config"
import { R2_BUCKET } from "@/lib/config.server"
import { getSiteConfig, getSiteUrl, r2Client } from "@/lib/utils.server"
import type { BrandAsset } from "@/types/site-config"

import {
  BRAND_ASSET_KEY_NAMES,
  BRAND_ASSET_KEY_PATTERN,
  BRAND_IMAGE_CONTENT_TYPES,
  type BrandImageType,
} from "./constants"

/**
 * Where `/manage/config` stores the site's images. The `brand/<name>-<hash>.<ext>` key layout is
 * this module's contract: the hash is of the content, so a key never changes what it serves.
 */
export async function uploadBrandAsset(
  asset: BrandAsset,
  body: Uint8Array,
  type: BrandImageType,
): Promise<string> {
  const hash = crypto.createHash("sha256").update(body).digest("hex").slice(0, 12)
  const key = `brand/${BRAND_ASSET_KEY_NAMES[asset]}-${hash}.${type}`
  await r2Client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: BRAND_IMAGE_CONTENT_TYPES[type],
    }),
  )
  return key
}

export async function readBrandAsset(key: string) {
  if (!BRAND_ASSET_KEY_PATTERN.test(key)) return null
  try {
    return await r2Client.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }))
  } catch (error) {
    if (error instanceof NoSuchKey) return null
    throw error
  }
}

/** Each rendition is a few KB and the icon rarely changes, so this stays small. */
const iconRenditionCache = new Map<string, Promise<Uint8Array<ArrayBuffer>>>()
const ICON_RENDITION_CACHE_MAX_ENTRIES = 32

/**
 * The site's icon as a square PNG of `size` pixels, from the upload or the bundled default.
 * `opaque` fills transparency with white, for iOS, which renders it black on the home screen.
 */
export async function readIconPng(
  size: number,
  { opaque = false } = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const { icon } = (await getSiteConfig()).branding
  const cacheKey = `${icon || "default"}:${size}:${opaque}`
  const cached = iconRenditionCache.get(cacheKey)
  if (cached) return cached

  if (iconRenditionCache.size >= ICON_RENDITION_CACHE_MAX_ENTRIES) iconRenditionCache.clear()
  const rendition = renderIconPng(icon, size, opaque)
  iconRenditionCache.set(cacheKey, rendition)
  // A failed read is retried on the next request rather than served as an error for good.
  rendition.catch(() => iconRenditionCache.delete(cacheKey))
  return rendition
}

async function renderIconPng(
  key: string,
  size: number,
  opaque: boolean,
): Promise<Uint8Array<ArrayBuffer>> {
  const [{ Jimp }, source] = await Promise.all([import("jimp"), readIconSource(key)])
  const image = (await Jimp.read(Buffer.from(source))).resize({ w: size, h: size })
  const output = opaque
    ? new Jimp({ width: size, height: size, color: 0xffffffff }).composite(image, 0, 0)
    : image
  return new Uint8Array(await output.getBuffer("image/png"))
}

async function readIconSource(key: string): Promise<Uint8Array> {
  if (key) {
    const object = await readBrandAsset(key)
    if (object?.Body) return object.Body.transformToByteArray()
    console.error(`The site icon ${key} is missing from R2; serving the default instead.`)
  }
  // `public/` isn't on disk next to the production bundle, so the default comes over HTTP.
  const response = await fetch(`${getSiteUrl()}${DEFAULT_ICON_PATH}`)
  if (!response.ok) throw new Error(`Failed to fetch the default icon: ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

/** The sizes an `.ico` carries: tabs, taskbars and the old desktop shortcut. */
const FAVICON_SIZES = [16, 32, 48]

/**
 * The uploaded favicon as is, since a hand-drawn 16px icon beats a downscaled one; otherwise an
 * `.ico` of PNGs built from the icon, which every browser since IE 11 reads.
 */
export async function readFaviconIco(): Promise<Uint8Array<ArrayBuffer>> {
  const { favicon } = (await getSiteConfig()).branding
  if (favicon) {
    const object = await readBrandAsset(favicon)
    if (object?.Body) return new Uint8Array(await object.Body.transformToByteArray())
    console.error(`The favicon ${favicon} is missing from R2; building one from the icon instead.`)
  }

  const images = await Promise.all(FAVICON_SIZES.map((size) => readIconPng(size)))
  const headerSize = 6 + 16 * images.length
  const ico = Buffer.alloc(headerSize + images.reduce((total, png) => total + png.length, 0))

  ico.writeUInt16LE(0, 0) // reserved
  ico.writeUInt16LE(1, 2) // type: icon
  ico.writeUInt16LE(images.length, 4)
  let offset = headerSize
  images.forEach((png, index) => {
    const entry = 6 + 16 * index
    ico.writeUInt8(FAVICON_SIZES[index], entry) // width; 0 would mean 256
    ico.writeUInt8(FAVICON_SIZES[index], entry + 1) // height
    ico.writeUInt16LE(1, entry + 4) // colour planes
    ico.writeUInt16LE(32, entry + 6) // bits per pixel
    ico.writeUInt32LE(png.length, entry + 8)
    ico.writeUInt32LE(offset, entry + 12)
    ico.set(png, offset)
    offset += png.length
  })
  return new Uint8Array(ico)
}
