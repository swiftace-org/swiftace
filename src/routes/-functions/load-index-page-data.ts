import { createServerFn } from "@tanstack/react-start"

import { readCourseSectionCounts, readPublicCourses } from "@/lib/db.server"

import { readVisibleReviews } from "../-lib/db.server"

export const loadIndexPageData = createServerFn()
  .validator((data: { includeReviews: boolean }) => data)
  .handler(async ({ data }) => {
    const courses = await readPublicCourses()
    const courseIds = courses.map((course) => course.id)
    const [lessonCounts, assignmentCounts, reviews] = await Promise.all([
      readCourseSectionCounts(courseIds, "LESSON"),
      readCourseSectionCounts(courseIds, "ASSIGNMENT"),
      data.includeReviews ? readVisibleReviews() : [],
    ])
    return { courses, lessonCounts, assignmentCounts, reviews }
  })
