/** A testimonial as the landing page shows it. Reviewers aren't accounts, so nothing links back. */
export type Review = {
  id: number
  name: string
  headline: string | null
  body: string
  avatarUrl: string | null
  sourceUrl: string | null
}

export type AdminReview = Review & { visibility: string }

/** A review as stored, once its form values are trimmed and checked. */
export type ReviewFields = Omit<AdminReview, "id">

/** What the edit dialog and the CSV import both send; blank optional fields become null. */
export type ReviewFormValues = {
  name: string
  headline: string
  body: string
  avatarUrl: string
  sourceUrl: string
  visibility: string
}
