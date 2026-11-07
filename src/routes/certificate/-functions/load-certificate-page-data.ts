import { createServerFn } from "@tanstack/react-start"

import { readCertificateBySlug } from "../-lib/db.server"
import { getCertificateAssetUrls } from "../-lib/utils.server"

export const loadCertificatePageData = createServerFn({ method: "GET" })
  .validator((data: { certificateSlug: string }) => data)
  .handler(async ({ data }) => {
    const certificate = await readCertificateBySlug(data.certificateSlug)
    if (!certificate) return null

    const { pdfUrl, imageUrl } = await getCertificateAssetUrls(certificate.slug)
    return { certificate, pdfUrl, imageUrl }
  })
