import crypto from "node:crypto"

import { GetObjectCommand, NoSuchKey, PutObjectCommand } from "@aws-sdk/client-s3"

import { getObjectStorage } from "@/lib/utils.server"

import { BRAND_IMAGE_CONTENT_TYPES } from "../../../../brand/-lib/constants"
import { REVIEW_AVATAR_KEY_PATTERN, REVIEW_AVATAR_TYPES } from "./constants"

export type ReviewAvatarType = (typeof REVIEW_AVATAR_TYPES)[number]

/**
 * Where uploaded reviewer photos go, as `reviews/<hash>.<ext>`. The hash is of the content, so a
 * key never changes what it serves and the same photo uploaded twice is stored once.
 */
export async function uploadReviewAvatar(
  body: Uint8Array,
  type: ReviewAvatarType,
): Promise<string> {
  const hash = crypto.createHash("sha256").update(body).digest("hex").slice(0, 12)
  const key = `reviews/${hash}.${type}`
  const { client, bucket } = await getObjectStorage()
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: BRAND_IMAGE_CONTENT_TYPES[type],
    }),
  )
  return key
}

export async function readReviewAvatar(key: string) {
  if (!REVIEW_AVATAR_KEY_PATTERN.test(key)) return null
  try {
    const { client, bucket } = await getObjectStorage()
    return await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  } catch (error) {
    if (error instanceof NoSuchKey) return null
    throw error
  }
}

/** `reviews/3fa9c2e1b07d.jpg` is served at `/assets/reviews/3fa9c2e1b07d.jpg`. */
export function toReviewAvatarUrl(key: string): string {
  return `/assets/${key}`
}
