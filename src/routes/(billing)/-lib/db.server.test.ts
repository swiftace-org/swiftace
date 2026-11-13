import { randomUUID } from "node:crypto"

import { and, eq } from "drizzle-orm"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ENROLLMENT_GRANTED_BY_SUBSCRIPTION, ENROLLMENT_REVOKED_BY_LAPSE } from "@/lib/config"

vi.mock("@/lib/config.server", () => ({ DATABASE_URL: process.env.TEST_DATABASE_URL }))

// Exercise the real correlated UPDATE against the throwaway database also used by CI.
describe.skipIf(!process.env.TEST_DATABASE_URL && !process.env.CI)(
  "course access after a subscription lapses",
  () => {
    let schema: typeof import("@/lib/schema.server")
    let billing: typeof import("./db.server")
    let learnerId: number

    beforeAll(async () => {
      schema = await import("@/lib/schema.server")
      billing = await import("./db.server")
    })
    beforeEach(async () => {
      learnerId = await account()
    })
    afterAll(async () => {
      await (globalThis as unknown as { __appDbPool?: { end(): Promise<void> } }).__appDbPool?.end()
    })

    async function account() {
      const username = randomUUID()
      const [row] = await schema.db
        .insert(schema.accounts)
        .values({ name: "Learner", username, email: `${username}@example.com` })
        .returning({ id: schema.accounts.id })
      return row!.id
    }

    async function course(options: { paymentStatus?: string | null; deleted?: boolean } = {}) {
      const [row] = await schema.db
        .insert(schema.courses)
        .values({ ownerId: learnerId, slug: randomUUID(), title: "Course", isPaid: true })
        .returning({ id: schema.courses.id })
      await schema.db.insert(schema.courseEnrollments).values({
        courseId: row!.id,
        enrolleeId: learnerId,
        paymentStatus: ENROLLMENT_GRANTED_BY_SUBSCRIPTION,
        ...options,
      })
      return row!.id
    }

    async function certificate(
      courseId: number,
      options: { deleted?: boolean; ownerId?: number; issuedAt?: Date | null } = {},
    ) {
      await schema.db.insert(schema.courseCertificates).values({
        courseId,
        ownerId: learnerId,
        slug: randomUUID(),
        issuedAt: new Date(),
        ...options,
      })
    }

    async function enrollment(courseId: number) {
      const [row] = await schema.db
        .select({
          deleted: schema.courseEnrollments.deleted,
          paymentStatus: schema.courseEnrollments.paymentStatus,
        })
        .from(schema.courseEnrollments)
        .where(
          and(
            eq(schema.courseEnrollments.courseId, courseId),
            eq(schema.courseEnrollments.enrolleeId, learnerId),
          ),
        )
      return row!
    }

    it("keeps certified courses while revoking courses without a certificate", async () => {
      const certified = await course()
      await certificate(certified)
      const unfinished = await course()

      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
      expect(await enrollment(certified)).toEqual({
        deleted: false,
        paymentStatus: ENROLLMENT_GRANTED_BY_SUBSCRIPTION,
      })
      expect(await enrollment(unfinished)).toEqual({
        deleted: true,
        paymentStatus: ENROLLMENT_REVOKED_BY_LAPSE,
      })

      expect(await billing.restoreLapsedCourseEnrollments(learnerId)).toBe(1)
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
      expect((await enrollment(certified)).deleted).toBe(false)
    })

    it("revokes access after all required sections are complete if no certificate was issued", async () => {
      const courseId = await course()
      const sections = await schema.db
        .insert(schema.courseSections)
        .values(
          ["LESSON", "ASSIGNMENT"].map((sectionType) => ({
            courseId,
            slug: randomUUID(),
            title: sectionType,
            sectionType,
            visibility: "VISIBLE",
          })),
        )
        .returning({ id: schema.courseSections.id, slug: schema.courseSections.slug })
      await schema.db
        .update(schema.courses)
        .set({ sections: sections.map((section) => section.slug) })
        .where(eq(schema.courses.id, courseId))
      await schema.db.insert(schema.courseSectionProgress).values(
        sections.map((section) => ({
          sectionId: section.id,
          enrolleeId: learnerId,
          progress: 100,
          completedAt: new Date(),
        })),
      )

      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
      expect((await enrollment(courseId)).deleted).toBe(true)
    })

    it("does not count a certificate reserved before issuance succeeds", async () => {
      const id = await course()
      await certificate(id, { deleted: true, issuedAt: null })
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
    })

    it.each(["deleted", "revoked"])(
      "does not count a %s certificate as completion",
      async (status) => {
        const id = await course()
        await certificate(id, { deleted: status === "deleted" })
        if (status === "revoked") {
          await schema.db
            .update(schema.courseEnrollments)
            .set({ certificationStatus: "REVOKED" })
            .where(eq(schema.courseEnrollments.courseId, id))
        }
        expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
      },
    )

    it("does not use another learner's certificate", async () => {
      const id = await course()
      await certificate(id, { ownerId: await account() })
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
    })

    it("requires a certificate even when the enrollment's certification status is PASS", async () => {
      const id = await course()
      await schema.db
        .update(schema.courseEnrollments)
        .set({ certificationStatus: "PASS" })
        .where(eq(schema.courseEnrollments.courseId, id))
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
    })

    it("leaves outright grants and admin removals unchanged", async () => {
      const granted = await course({ paymentStatus: null })
      const removed = await course({ deleted: true })
      await certificate(removed)
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(0)
      expect(await billing.restoreLapsedCourseEnrollments(learnerId)).toBe(0)
      expect(await enrollment(granted)).toEqual({ deleted: false, paymentStatus: null })
      expect(await enrollment(removed)).toEqual({
        deleted: true,
        paymentStatus: ENROLLMENT_GRANTED_BY_SUBSCRIPTION,
      })
    })
  },
)
