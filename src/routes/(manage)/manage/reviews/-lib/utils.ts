import { parseCsv } from "@/lib/utils"
import type { AdminReview, ReviewFields, ReviewFormValues } from "@/types/review"

import {
  DEFAULT_REVIEW_VISIBILITY,
  REVIEW_BODY_MAX_LENGTH,
  REVIEW_CSV_COLUMNS,
  REVIEW_HEADLINE_MAX_LENGTH,
  REVIEW_IMPORT_MAX_ROWS,
  REVIEW_NAME_MAX_LENGTH,
  REVIEW_URL_MAX_LENGTH,
  REVIEW_VISIBILITY_VALUES,
} from "./constants"

/** Run by the dialog, the import and the server functions, so all three reject the same input. */
export function toReviewFields(
  values: ReviewFormValues,
): { fields: ReviewFields } | { error: string } {
  const name = values.name.trim()
  const headline = values.headline.trim()
  const body = values.body.trim()
  const avatarUrl = values.avatarUrl.trim()
  const sourceUrl = values.sourceUrl.trim()

  if (!name) return { error: "Name cannot be empty." }
  if (name.length > REVIEW_NAME_MAX_LENGTH) {
    return { error: `Name must be at most ${REVIEW_NAME_MAX_LENGTH} characters.` }
  }
  if (headline.length > REVIEW_HEADLINE_MAX_LENGTH) {
    return { error: `Headline must be at most ${REVIEW_HEADLINE_MAX_LENGTH} characters.` }
  }
  if (!body) return { error: "Review cannot be empty." }
  if (body.length > REVIEW_BODY_MAX_LENGTH) {
    return { error: `Review must be at most ${REVIEW_BODY_MAX_LENGTH} characters.` }
  }
  // A site path like `/assets/reviews/3fa9c2e1b07d.png` is fine for the avatar, since it's served from here.
  if (avatarUrl && !(avatarUrl.startsWith("/") || isWebUrl(avatarUrl))) {
    return { error: "Avatar URL must start with https:// or /." }
  }
  if (sourceUrl && !isWebUrl(sourceUrl)) {
    return { error: "Source URL must start with https://." }
  }
  if (Math.max(avatarUrl.length, sourceUrl.length) > REVIEW_URL_MAX_LENGTH) {
    return { error: `URLs must be at most ${REVIEW_URL_MAX_LENGTH} characters.` }
  }
  if (!REVIEW_VISIBILITY_VALUES.includes(values.visibility)) {
    return { error: `Visibility must be one of ${REVIEW_VISIBILITY_VALUES.join(", ")}.` }
  }

  return {
    fields: {
      name,
      headline: headline || null,
      body,
      avatarUrl: avatarUrl || null,
      sourceUrl: sourceUrl || null,
      visibility: values.visibility,
    },
  }
}

export function toReviewFormValues(review: AdminReview): ReviewFormValues {
  return {
    name: review.name,
    headline: review.headline ?? "",
    body: review.body,
    avatarUrl: review.avatarUrl ?? "",
    sourceUrl: review.sourceUrl ?? "",
    visibility: review.visibility,
  }
}

/** Reads an import file, naming the first bad row so it can be fixed before anything is saved. */
export function parseReviewsCsv(text: string): { rows: ReviewFormValues[] } | { error: string } {
  const [header, ...lines] = parseCsv(text.replace(/^﻿/, "")).filter((row) =>
    row.some((cell) => cell.trim()),
  )
  if (!header) return { error: "The file is empty." }

  // Spreadsheet exports often title-case headers, so `Avatar URL` reads as `avatar_url`.
  const columns = header.map((cell) =>
    cell
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_"),
  )
  const columnIndex = Object.fromEntries(
    REVIEW_CSV_COLUMNS.map((column) => [column, columns.indexOf(column)]),
  ) as Record<(typeof REVIEW_CSV_COLUMNS)[number], number>
  if (columnIndex.name < 0 || columnIndex.body < 0) {
    return {
      error: `The header row needs ${REVIEW_CSV_COLUMNS.join(", ")} (name and body required).`,
    }
  }
  if (!lines.length) return { error: "The file has no reviews below the header row." }
  if (lines.length > REVIEW_IMPORT_MAX_ROWS) {
    return { error: `Import at most ${REVIEW_IMPORT_MAX_ROWS} reviews at a time.` }
  }

  const cell = (line: string[], column: (typeof REVIEW_CSV_COLUMNS)[number]) =>
    columnIndex[column] < 0 ? "" : (line[columnIndex[column]] ?? "")

  const rows: ReviewFormValues[] = []
  for (const [index, line] of lines.entries()) {
    const values: ReviewFormValues = {
      name: cell(line, "name"),
      headline: cell(line, "headline"),
      body: cell(line, "body"),
      avatarUrl: cell(line, "avatar_url"),
      sourceUrl: cell(line, "source_url"),
      visibility: cell(line, "visibility").trim().toUpperCase() || DEFAULT_REVIEW_VISIBILITY,
    }
    const result = toReviewFields(values)
    // +2: the header is row 1 and spreadsheets count from 1.
    if ("error" in result) return { error: `Row ${index + 2}: ${result.error}` }
    rows.push(values)
  }
  return { rows }
}

function isWebUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:"
  } catch {
    return false
  }
}
