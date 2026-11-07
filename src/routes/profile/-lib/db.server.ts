import { and, desc, eq } from "drizzle-orm"

import { courseCertificates, courses, db } from "@/lib/schema.server"
import type { AccountCertificate } from "@/types/certificate"

export async function readCertificatesByAccountId(
  accountId: number,
): Promise<AccountCertificate[]> {
  return db
    .select({
      id: courseCertificates.id,
      slug: courseCertificates.slug,
      issuedAt: courseCertificates.issuedAt,
      createdAt: courseCertificates.createdAt,
      course: {
        id: courses.id,
        slug: courses.slug,
        title: courses.title,
        shortDescription: courses.shortDescription,
        cover: courses.cover,
        isPaid: courses.isPaid,
        visibility: courses.visibility,
      },
    })
    .from(courseCertificates)
    .innerJoin(courses, eq(courseCertificates.courseId, courses.id))
    .where(and(eq(courseCertificates.ownerId, accountId), eq(courseCertificates.deleted, false)))
    .orderBy(desc(courseCertificates.issuedAt), desc(courseCertificates.createdAt))
}
