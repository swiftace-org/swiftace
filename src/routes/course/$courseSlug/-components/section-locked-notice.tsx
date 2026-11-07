import { Link } from "@tanstack/react-router"
import { LockIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * What a paid course's section shows someone who hasn't enrolled. The server sends none of the
 * content down, so this is the whole page — the course page is where they can enroll.
 */
export function SectionLockedNotice({
  courseSlug,
  sectionType,
}: {
  courseSlug: string
  sectionType: "lesson" | "assignment"
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <LockIcon className="size-6" aria-hidden />
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-lg font-medium">This {sectionType} is for enrolled learners</p>
        <p className="text-sm text-muted-foreground">
          Enroll in the course to open it and track your progress.
        </p>
      </div>
      <Button
        render={
          <Link to="/course/$courseSlug" params={{ courseSlug }}>
            Go to the course
          </Link>
        }
        nativeButton={false}
      />
    </div>
  )
}
