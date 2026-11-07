import { useNavigate, useRouterState } from "@tanstack/react-router"
import { GraduationCapIcon, HelpCircleIcon, NotebookTextIcon } from "lucide-react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TAB_ROUTES = {
  notes: "/course/$courseSlug/lesson/$sectionSlug",
  questions: "/course/$courseSlug/lesson/$sectionSlug/questions",
  "instructor-notes": "/course/$courseSlug/lesson/$sectionSlug/instructor-notes",
} as const

export function LessonTabs({
  courseSlug,
  sectionSlug,
  showQuestions,
  showInstructorNotes,
}: {
  courseSlug: string
  sectionSlug: string
  showQuestions: boolean
  showInstructorNotes: boolean
}) {
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const value = pathname.endsWith("/questions")
    ? "questions"
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
        {showQuestions && (
          <TabsTrigger
            value="questions"
            className="cursor-pointer gap-2 px-4 py-2 text-base [&_svg:not([class*='size-'])]:size-5"
          >
            <HelpCircleIcon />
            Questions
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
