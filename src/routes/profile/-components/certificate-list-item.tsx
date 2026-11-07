import { Link } from "@tanstack/react-router"
import { GraduationCap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useSiteConfig } from "@/lib/hooks"
import type { AccountCertificate } from "@/types/certificate"

export function CertificateListItem({ certificate }: { certificate: AccountCertificate }) {
  const { course, issuedAt } = certificate
  const { branding } = useSiteConfig()
  const cover = course.cover || branding.courseCoverUrl

  return (
    <li className="flex items-center gap-4 rounded-lg border p-3">
      <img
        alt={`${course.title} cover`}
        src={cover}
        className="h-12 w-20 shrink-0 rounded-md object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{course.title}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <GraduationCap className="h-3 w-3" />
          {issuedAt
            ? `Issued ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(issuedAt)}`
            : "In progress"}
        </p>
      </div>
      <Button
        render={
          <Link to="/certificate/$certificateSlug" params={{ certificateSlug: certificate.slug }}>
            View
          </Link>
        }
        nativeButton={false}
        variant="ghost"
        size="sm"
      />
    </li>
  )
}
