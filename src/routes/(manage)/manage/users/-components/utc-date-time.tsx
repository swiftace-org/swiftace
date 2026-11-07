import { formatDateTime, formatDateTimeUtc } from "../-lib/utils"

/** `withZone` spells out "UTC" for a time standing on its own rather than under a header. */
export function UtcDateTime({
  value,
  withZone = false,
  className,
}: {
  value: Date | string
  withZone?: boolean
  className?: string
}) {
  return (
    <time dateTime={new Date(value).toISOString()} className={className}>
      {withZone ? formatDateTimeUtc(value) : formatDateTime(value)}
    </time>
  )
}
