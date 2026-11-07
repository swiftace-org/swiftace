import { useNavigate, useRouterState } from "@tanstack/react-router"
import { GraduationCapIcon, NotebookTextIcon, UploadIcon } from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TAB_ROUTES = {
  notes: "/course/$courseSlug/assignment/$sectionSlug",
  submit: "/course/$courseSlug/assignment/$sectionSlug/submit",
  "instructor-notes": "/course/$courseSlug/assignment/$sectionSlug/instructor-notes",
} as const

export function AssignmentTabs({
  courseSlug,
  sectionSlug,
  showSubmit,
  showInstructorNotes,
}: {
  courseSlug: string
  sectionSlug: string
  showSubmit: boolean
  showInstructorNotes: boolean
}) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const value = pathname.endsWith("/submit")
    ? "submit"
    : pathname.endsWith("/instructor-notes")
      ? "instructor-notes"
      : "notes"

  return (
    <Tabs
      value={value}
      onValueChange={(nextValue) => {
        void navigate({
          to: TAB_ROUTES[nextValue as keyof typeof TAB_ROUTES],
          params: { courseSlug, sectionSlug },
        })
      }}
    >
      <TabsList className="group-data-horizontal/tabs:h-11 p-1" variant="line">
        <TabsTrigger
          value="notes"
          className="cursor-pointer gap-2 px-4 py-2 text-base [&_svg:not([class*='size-'])]:size-5"
        >
          <NotebookTextIcon />
          Notes
        </TabsTrigger>
        {showSubmit && (
          <TabsTrigger
            value="submit"
            className="cursor-pointer gap-2 px-4 py-2 text-base [&_svg:not([class*='size-'])]:size-5"
          >
            <UploadIcon />
            Submit
          </TabsTrigger>
        )}
        {showInstructorNotes && (
          <TabsTrigger
            value="instructor-notes"
            className="cursor-pointer gap-2 px-4 py-2 text-base [&_svg:not([class*='size-'])]:size-5"
          >
            <GraduationCapIcon />
            Instructor Notes
          </TabsTrigger>
        )}
      </TabsList>
    </Tabs>
  )
}
