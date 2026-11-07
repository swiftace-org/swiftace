import { ExternalLinkIcon } from "lucide-react"

import { IconButton } from "@/components/icon-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { getInitials } from "@/lib/utils"
import type { Review } from "@/types/review"

import { toReviewSource } from "../-lib/utils"

export function ReviewCard({ review }: { review: Review }) {
  const { name, headline, body, avatarUrl, sourceUrl } = review
  const source = sourceUrl ? toReviewSource(sourceUrl) : null

  return (
    <Card className="gap-4 p-5 shadow-none sm:p-6">
      <div className="flex items-center gap-3">
        <Avatar className="size-11">
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{name}</p>
          {headline && <p className="leading-snug text-muted-foreground">{headline}</p>}
        </div>
        {sourceUrl && source && (
          <IconButton
            tooltip={`View on ${source.label}`}
            className="-mt-1 -mr-1.5 self-start text-muted-foreground/70 hover:text-foreground"
            nativeButton={false}
            render={
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${name} on ${source.label}`}
              />
            }
          >
            {source.site === "linkedin" ? (
              <LinkedInLogo />
            ) : source.site === "producthunt" ? (
              <ProductHuntLogo />
            ) : (
              <ExternalLinkIcon />
            )}
          </IconButton>
        )}
      </div>
      <blockquote className="whitespace-pre-line text-[0.9375rem] leading-relaxed">
        {body}
      </blockquote>
    </Card>
  )
}

// Brand marks aren't in lucide; these are the sites' own logos (via Simple Icons), drawn in grey.
function LinkedInLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

function ProductHuntLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M13.604 8.4h-3.405V12h3.405c.995 0 1.801-.806 1.801-1.801 0-.993-.805-1.799-1.801-1.799zM12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm1.604 14.4h-3.405V18H7.801V6h5.804c2.319 0 4.2 1.88 4.2 4.199 0 2.321-1.881 4.201-4.201 4.201z" />
    </svg>
  )
}
