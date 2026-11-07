import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { UserDeletionCertificate, UserDeletionCounts, UserDeletionPreview } from "@/types/user"

import { USER_DELETION_DELETED_ITEMS, USER_DELETION_UNLINKED_ITEMS } from "../-lib/constants"
import { formatDate } from "../../-lib/utils"

export function DeletionSummary({
  preview,
  selfService = false,
}: {
  preview: UserDeletionPreview
  selfService?: boolean
}) {
  const deleted = USER_DELETION_DELETED_ITEMS.filter((item) => preview.counts[item.key])
  const unlinked = USER_DELETION_UNLINKED_ITEMS.filter((item) => preview.counts[item.key])

  return (
    <div className="space-y-4 text-sm">
      <CountList
        title="Deleted"
        items={[
          { key: "account", label: "The account itself", count: 1 },
          ...toCounts(deleted, preview.counts),
        ]}
      />
      {unlinked.length ? (
        <CountList
          title={`Kept, but no longer linked to ${selfService ? "you" : "them"}`}
          items={toCounts(unlinked, preview.counts)}
        />
      ) : null}
      {preview.certificates.length ? (
        <CertificateDownloads certificates={preview.certificates} />
      ) : null}
    </div>
  )
}

function CountList({
  title,
  items,
}: {
  title: string
  items: { key: string; label: string; count: number }[]
}) {
  return (
    <div className="space-y-1.5">
      <p className="font-medium">{title}</p>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex justify-between gap-4 text-muted-foreground">
            <span>{item.label}</span>
            <span className="tabular-nums text-foreground">{item.count.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CertificateDownloads({ certificates }: { certificates: UserDeletionCertificate[] }) {
  function downloadAll() {
    for (const certificate of certificates) {
      const link = document.createElement("a")
      link.href = certificate.downloadUrl
      link.click()
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium">Save the certificates first</p>
        {certificates.length > 1 ? (
          <Button type="button" variant="outline" size="xs" onClick={downloadAll}>
            <Download />
            Download all
          </Button>
        ) : null}
      </div>
      <ul className="space-y-1">
        {certificates.map((certificate) => (
          <li key={certificate.slug} className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate text-muted-foreground">
              {certificate.courseTitle} · {formatDate(certificate.issuedAt)}
            </span>
            <Button
              variant="outline"
              size="xs"
              nativeButton={false}
              render={
                <a
                  href={certificate.downloadUrl}
                  aria-label={`Download the ${certificate.courseTitle} certificate`}
                />
              }
            >
              <Download />
              PDF
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DeletionSummaryPending() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-5 w-20" />
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-4 w-full" />
      ))}
    </div>
  )
}

function toCounts(
  items: { key: keyof UserDeletionCounts; label: string }[],
  counts: UserDeletionCounts,
) {
  return items.map((item) => ({ ...item, count: counts[item.key] }))
}
