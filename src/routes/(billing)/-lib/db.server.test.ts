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

    type Section = {
      progress?: number
      progressDeleted?: boolean
      isOptional?: boolean
      deleted?: boolean
      visibility?: string | null
      sectionType?: string
      listed?: boolean
      enrolleeId?: number
    }

    async function sections(courseId: number, items: Section[]) {
      const slugs: string[] = []
      for (const item of items) {
        const slug = randomUUID()
        const { progress, progressDeleted, listed, enrolleeId, ...fields } = item
        const [section] = await schema.db
          .insert(schema.courseSections)
          .values({
            courseId,
            slug,
            title: "Section",
            sectionType: "LESSON",
            visibility: "VISIBLE",
            ...fields,
          })
          .returning({ id: schema.courseSections.id })
        if (listed !== false) slugs.push(slug)
        if (progress !== undefined) {
          await schema.db.insert(schema.courseSectionProgress).values({
            sectionId: section!.id,
            enrolleeId: enrolleeId ?? learnerId,
            progress,
            deleted: progressDeleted ?? false,
          })
        }
      }
      await schema.db
        .update(schema.courses)
        .set({ sections: slugs })
        .where(eq(schema.courses.id, courseId))
    }

    async function certificate(
      courseId: number,
      options: { deleted?: boolean; ownerId?: number } = {},
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

    it("keeps completed courses while revoking unfinished courses for the same learner", async () => {
      const completed = await course()
      await sections(completed, [
        { progress: 100 },
        { sectionType: "ASSIGNMENT", progress: 100 },
        { isOptional: true },
        { visibility: "DRAFT" },
        { deleted: true },
        { listed: false },
        { sectionType: "HEADER" },
      ])
      const unfinished = await course()
      await sections(unfinished, [{ progress: 100 }, { sectionType: "ASSIGNMENT" }])

      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
      expect(await enrollment(completed)).toEqual({
        deleted: false,
        paymentStatus: ENROLLMENT_GRANTED_BY_SUBSCRIPTION,
      })
      expect(await enrollment(unfinished)).toEqual({
        deleted: true,
        paymentStatus: ENROLLMENT_REVOKED_BY_LAPSE,
      })

      expect(await billing.restoreLapsedCourseEnrollments(learnerId)).toBe(1)
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
      expect((await enrollment(completed)).deleted).toBe(false)
    })

    it("keeps a course with a valid certificate even if its sections are unfinished", async () => {
      const id = await course()
      await sections(id, [{}])
      await certificate(id)
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(0)
      expect((await enrollment(id)).deleted).toBe(false)
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

    it.each<Section>([
      {},
      { progress: 99 },
      { progress: 100, progressDeleted: true },
      { visibility: "HIDDEN" },
      { visibility: null },
    ])("requires completed progress for every required listed section: %j", async (incomplete) => {
      const id = await course()
      await sections(id, [{ progress: 100 }, incomplete])
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
    })

    it("does not use another learner's certificate or progress", async () => {
      const id = await course()
      const otherId = await account()
      await sections(id, [{ progress: 100, enrolleeId: otherId }])
      await certificate(id, { ownerId: otherId })
      expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
    })

    it.each([
      { items: [] },
      { items: [{ isOptional: true, progress: 100 }] },
      { items: [{ visibility: "DRAFT", progress: 100 }] },
    ])(
      "does not count a course with no required sections as completed: $items",
      async ({ items }) => {
        const id = await course()
        await sections(id, items)
        expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
      },
    )

    it.each([null, { lesson: true }])(
      "does not count a missing or malformed section list: %j",
      async (list) => {
        const id = await course()
        await sections(id, [{ progress: 100 }])
        await schema.db
          .update(schema.courses)
          .set({ sections: list })
          .where(eq(schema.courses.id, id))
        expect(await billing.softDeleteLapsedCourseEnrollments(learnerId)).toBe(1)
      },
    )

    it("leaves outright grants and admin removals unchanged", async () => {
      const granted = await course({ paymentStatus: null })
      const removed = await course({ deleted: true })
      await sections(removed, [{ progress: 100 }])
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
