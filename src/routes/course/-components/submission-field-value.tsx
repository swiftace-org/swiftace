import { BlueLink } from "@/components/blue-link"
import { Markdown } from "@/components/markdown"
import type { SubmissionField } from "@/types/assignment"

/** Splits on URLs while keeping them, so the plain-text branch can linkify what it finds. */
const URL_PATTERN = /(https?:\/\/[^\s]+)/g

export function SubmissionFieldValue({ field }: { field: SubmissionField }) {
  if (field.html) {
    // An essay-length answer would otherwise push every other row off the screen.
    return (
      <div className="max-h-64 overflow-y-auto">
        <Markdown markup={field.html} className="prose-sm" />
      </div>
    )
  }

  return (
    <p className="text-sm break-words whitespace-pre-wrap">
      {field.value.split(URL_PATTERN).map((part, index) =>
        part.startsWith("http://") || part.startsWith("https://") ? (
          <BlueLink external colored key={index} href={part} target="_blank" rel="noreferrer">
            {part}
          </BlueLink>
        ) : (
          part
        ),
      )}
    </p>
  )
}
