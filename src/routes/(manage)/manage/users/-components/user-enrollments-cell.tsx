import { BlueLink } from "@/components/blue-link"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { UserEnrollmentSummary } from "@/types/user"

import { UtcDateTime } from "./utc-date-time"

/** Paid and free counts, with the courses behind them a hover (or, on a phone, a tap) away. */
export function UserEnrollmentsCell({ enrollments }: { enrollments: UserEnrollmentSummary[] }) {
  // Most accounts never enroll; spelling out the zeros keeps that from looking like a glitch.
  if (!enrollments.length) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-muted-foreground tabular-nums">
        <span>0 Paid</span>
        <span>·</span>
        <span>0 Free</span>
      </span>
    )
  }

  const paid = enrollments.filter((enrollment) => enrollment.paid).length
  const free = enrollments.length - paid

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={150}
        // Taller than the text, so the popover isn't a pixel hunt; the negative margins keep the
        // counts aligned with the column while the hit area grows.
        className="-my-1.5 -mr-2 inline-flex h-8 cursor-pointer items-center justify-end gap-1.5 rounded-md px-2 whitespace-nowrap tabular-nums hover:bg-muted data-popup-open:bg-muted"
      >
        <span className={paid ? "font-medium" : "text-muted-foreground"}>{paid} Paid</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{free} Free</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-2 p-3">
        <p className="text-xs font-medium text-muted-foreground">
          {enrollments.length} {enrollments.length === 1 ? "enrollment" : "enrollments"}
        </p>
        <ul className="max-h-72 space-y-2 overflow-y-auto">
          {enrollments.map((enrollment) => (
            <li key={enrollment.courseSlug} className="flex flex-col">
              <span className="flex items-start justify-between gap-2">
                <BlueLink
                  to="/course/$courseSlug"
                  params={{ courseSlug: enrollment.courseSlug }}
                  className="text-sm font-medium"
                >
                  {enrollment.courseTitle}
                </BlueLink>
                {enrollment.paid ? <Badge variant="outline">Paid</Badge> : null}
              </span>
              <UtcDateTime
                withZone
                value={enrollment.enrolledAt}
                className="text-xs text-muted-foreground"
              />
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
