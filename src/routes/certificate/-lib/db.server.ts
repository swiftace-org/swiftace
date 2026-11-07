import { and, eq } from "drizzle-orm"

import { accounts, courseCertificates, courses, db } from "@/lib/schema.server"
import type { CertificateDisplay } from "@/types/certificate"

export async function readCertificateBySlug(slug: string): Promise<CertificateDisplay | null> {
  const [certificate] = await db
    .select({
      id: courseCertificates.id,
      slug: courseCertificates.slug,
      printedName: courseCertificates.printedName,
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
      owner: { name: accounts.name, username: accounts.username },
    })
    .from(courseCertificates)
    .innerJoin(courses, eq(courseCertificates.courseId, courses.id))
    .innerJoin(accounts, eq(courseCertificates.ownerId, accounts.id))
    .where(and(eq(courseCertificates.slug, slug), eq(courseCertificates.deleted, false)))
    .limit(1)

  return certificate ?? null
}
