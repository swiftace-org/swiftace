import type { Account } from "@/types/account"
import type { CourseDisplay } from "@/types/course"

export type CertificateDisplay = {
  id: number
  slug: string
  printedName: string | null
  issuedAt: Date | null
  createdAt: Date
  course: CourseDisplay
  owner: Pick<Account, "name" | "username">
}

export type AccountCertificate = {
  id: number
  slug: string
  issuedAt: Date | null
  createdAt: Date
  course: CourseDisplay
}
