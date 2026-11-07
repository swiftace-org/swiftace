import { createServerFn } from "@tanstack/react-start"

import {
  createOrRestoreCourseEnrollment,
  readAccountByEmail,
  readAccountByEmailCaseInsensitive,
  readCourseBySlugForAdmin,
} from "@/lib/db.server"
import { adminMiddleware, normalizeEmail } from "@/lib/utils"

import { readAccountByUsername } from "../-lib/db.server"

/**
 * Enrolls an existing account by username or email address. Accounts aren't created here —
 * somebody has to have signed up before they can be added to a course.
 */
export const submitAddCourseParticipant = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator((data: { courseSlug: string; identifier: string }) => data)
  .handler(
    async ({
      data,
    }): Promise<{ participant: { name: string; username: string } } | { error: string }> => {
      const identifier = data.identifier.trim()
      if (!identifier) {
        return { error: "Enter a username or email address." }
      }

      const course = await readCourseBySlugForAdmin(data.courseSlug)
      if (!course) {
        return { error: "Course not found." }
      }

      const account = await findAccount(identifier)
      if (!account) {
        return { error: `No account found for "${identifier}".` }
      }

      try {
        const enrolled = await createOrRestoreCourseEnrollment({
          courseId: course.id,
          enrolleeId: account.id,
        })
        if (!enrolled) {
          return { error: `${account.name} is already a participant of ${course.title}.` }
        }
      } catch (error) {
        console.error("Failed to add course participant.", error)
        return { error: "Could not add this participant. Please try again." }
      }

      return { participant: { name: account.name, username: account.username } }
    },
  )

/** An email address is unmistakable, so anything without an `@` is treated as a username. */
async function findAccount(identifier: string) {
  if (!identifier.includes("@")) {
    return readAccountByUsername(identifier)
  }

  const email = normalizeEmail(identifier)
  return (await readAccountByEmail(email)) ?? (await readAccountByEmailCaseInsensitive(email))
}
