/** Which way a sortable table column is pointing. Shared by every table in the admin area. */
export type SortOrder = "asc" | "desc"

/** A file sent inside an email rather than linked from it. */
export type EmailAttachment = {
  filename: string
  contentType: string
  content: Uint8Array
}
