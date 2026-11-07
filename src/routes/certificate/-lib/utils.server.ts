import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { R2_BUCKET } from "@/lib/config.server"
import { deleteR2Objects, r2Client } from "@/lib/utils.server"

import {
  CERTIFICATE_IMAGE_FILENAME,
  CERTIFICATE_PDF_FILENAME,
  CERTIFICATE_URL_EXPIRY_SECONDS,
} from "./constants.server"

/**
 * Where a certificate's rendered assets live. The `certificates/<slug>/` key layout is this
 * module's contract: the participants page writes through `uploadCertificateAssets`.
 */

async function getPresignedCertificateUrl(slug: string, filename: string, downloadAs?: string) {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: `certificates/${slug}/${filename}`,
      ResponseContentDisposition: downloadAs && `attachment; filename="${downloadAs}"`,
    }),
    { expiresIn: CERTIFICATE_URL_EXPIRY_SECONDS },
  )
}

export async function getCertificateAssetUrls(slug: string) {
  const [pdfUrl, imageUrl] = await Promise.all([
    getPresignedCertificateUrl(slug, CERTIFICATE_PDF_FILENAME),
    getPresignedCertificateUrl(slug, CERTIFICATE_IMAGE_FILENAME),
  ])
  return { pdfUrl, imageUrl }
}

/**
 * Both halves go to the same prefix the reader presigns from, and are written together so a
 * certificate can never be half-replaced by a re-issue.
 */
export async function uploadCertificateAssets(
  slug: string,
  assets: { pdf: Uint8Array; image: Uint8Array },
): Promise<void> {
  await Promise.all([
    r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `certificates/${slug}/${CERTIFICATE_PDF_FILENAME}`,
        Body: assets.pdf,
        ContentType: "application/pdf",
      }),
    ),
    r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: `certificates/${slug}/${CERTIFICATE_IMAGE_FILENAME}`,
        Body: assets.image,
        ContentType: "image/jpeg",
      }),
    ),
  ])
}

/** Saves the PDF under `downloadAs` rather than opening it, so a batch of them stays apart. */
export function getCertificateDownloadUrl(slug: string, downloadAs: string) {
  return getPresignedCertificateUrl(slug, CERTIFICATE_PDF_FILENAME, downloadAs)
}

/** A slug that was reserved but never rendered has no objects, which R2 ignores. */
export async function deleteCertificateAssets(slugs: string[]): Promise<void> {
  const keys = slugs.flatMap((slug) =>
    [CERTIFICATE_PDF_FILENAME, CERTIFICATE_IMAGE_FILENAME].map(
      (filename) => `certificates/${slug}/${filename}`,
    ),
  )
  await deleteR2Objects(keys)
}
