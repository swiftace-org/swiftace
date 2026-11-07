import { Markdown } from "@/components/markdown"

/** Only an admin's course payload carries `additionalInformationHtml`, so this is admin-only. */
export function CourseSectionInstructorNotes({ markup }: { markup: string | null }) {
  if (!markup) return null

  return (
    <div className="mb-4">
      <Markdown markup={markup} />
    </div>
  )
}
