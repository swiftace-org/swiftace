import { useLocation } from "@tanstack/react-router"
import { XIcon } from "lucide-react"
import { useEffect } from "react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"

import { AiTutorPanel } from "./ai-tutor-panel"
import { CourseSidebar, type CourseSectionForSidebar } from "./course-sidebar"

export function CourseMobileSidebars({
  courseSlug,
  courseTitle,
  sections,
  showAiTutor,
  leftOpen,
  onLeftOpenChange,
  rightOpen,
  onRightOpenChange,
}: {
  courseSlug: string
  courseTitle: string
  sections: CourseSectionForSidebar[]
  showAiTutor: boolean
  leftOpen: boolean
  onLeftOpenChange: (open: boolean) => void
  rightOpen: boolean
  onRightOpenChange: (open: boolean) => void
}) {
  const { pathname } = useLocation()

  // CourseLayout stays mounted across nested route navigation, so the sheets
  // must be closed explicitly on route change or they keep covering the page.
  useEffect(() => {
    onLeftOpenChange(false)
    onRightOpenChange(false)
  }, [pathname, onLeftOpenChange, onRightOpenChange])

  return (
    <>
      <Sheet open={leftOpen} onOpenChange={onLeftOpenChange}>
        <SheetContent side="left" showCloseButton={false} className="gap-0 p-0">
          <SheetDescription className="sr-only">Displays the course contents.</SheetDescription>
          <div className="flex items-center justify-between border-b px-4 py-3">
            <SheetTitle className="text-sm">Course Contents</SheetTitle>
            <SheetClose
              render={
                <Button variant="ghost" size="icon-sm">
                  <XIcon />
                  <span className="sr-only">Close</span>
                </Button>
              }
            />
          </div>
          <CourseSidebar courseSlug={courseSlug} courseTitle={courseTitle} sections={sections} />
        </SheetContent>
      </Sheet>

      {showAiTutor && (
        <Sheet open={rightOpen} onOpenChange={onRightOpenChange}>
          <SheetContent
            side="right"
            showCloseButton={false}
            className="gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-md"
          >
            <SheetTitle className="sr-only">AI tutor</SheetTitle>
            <SheetDescription className="sr-only">
              Chat with the course's AI tutor.
            </SheetDescription>
            <AiTutorPanel
              courseTitle={courseTitle}
              sections={sections}
              isOpen={rightOpen}
              onClose={() => onRightOpenChange(false)}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  )
}
