import { createServerFn } from "@tanstack/react-start"

import { authMiddleware } from "@/lib/utils"
import { captureEvent, readCourseForViewer } from "@/lib/utils.server"

import { createOrUpdateSectionCompletion, readCourseSectionsBySlugs } from "../../../-lib/db.server"
import { canOpenSection } from "../../../-lib/utils"

/**
 * Marks a lesson finished for the enrollee who asked, mirroring the legacy `make_submission`
 * branch for lessons. A lesson with `require_questions` has no button — answering its quiz is
 * what completes it — so this refuses one, otherwise the two paths could disagree.
 */
export const submitLessonCompletion = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { courseSlug: string; sectionSlug: string }) => data)
  .handler(async ({ data, context }): Promise<{ completed: true } | { error: string }> => {
    const { account } = context

    const viewer = await readCourseForViewer(data.courseSlug)
    if (!viewer) return { error: "This lesson could not be found." }

    const [section] = await readCourseSectionsBySlugs(viewer.course.id, [data.sectionSlug])
    if (!section || section.sectionType !== "LESSON") {
      return { error: "This lesson could not be found." }
    }
    if (!canOpenSection(section, viewer)) return { error: "This lesson could not be found." }
    if (!viewer.isEnrolled) return { error: "Enroll in this course to track your progress." }
    if (section.requireQuestions) {
      return { error: "Answer all the questions to complete this lesson." }
    }

    try {
      await createOrUpdateSectionCompletion({
        sectionId: section.id,
        enrolleeId: account.id,
        completedAt: new Date(),
      })
    } catch (error) {
      console.error("submitLessonCompletion: failed to record completion", error)
      return { error: "Couldn't save your progress. Please try again." }
    }

    captureEvent(account.id, "lesson_completed", {
      courseSlug: data.courseSlug,
      sectionSlug: data.sectionSlug,
      viaQuiz: false,
    })
    return { completed: true }
  })
