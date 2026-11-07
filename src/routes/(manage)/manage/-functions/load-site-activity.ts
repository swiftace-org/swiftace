import { createServerFn } from "@tanstack/react-start"

import { adminMiddleware } from "@/lib/utils"
import type { SiteActivityCursor, SiteActivityPage } from "@/types/user"

import { MAX_SITE_ACTIVITY_LIMIT } from "../-lib/constants"
import { readSiteActivity } from "../-lib/db.server"
import { toUserActivity } from "../-lib/utils.server"

/** One page of every account's activity, newest first, for the dashboard and `/manage/activity`. */
export const loadSiteActivity = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(
    (data: { cursor: SiteActivityCursor | null; limit: number; includeAdmins: boolean }) => ({
      cursor: toSiteActivityCursor(data.cursor),
      limit: Math.min(Math.max(Math.trunc(data.limit) || 1, 1), MAX_SITE_ACTIVITY_LIMIT),
      includeAdmins: data.includeAdmins === true,
    }),
  )
  .handler(async ({ data }): Promise<SiteActivityPage> => {
    const { rows, cursor } = await readSiteActivity(data.cursor, data.limit, data.includeAdmins)

    return {
      activity: rows.map((row) => ({
        ...toUserActivity(row),
        account:
          row.account_id === null || row.account_name === null
            ? null
            : {
                id: Number(row.account_id),
                name: row.account_name,
                username: row.account_username ?? "",
              },
      })),
      nextCursor: cursor,
    }
  })

/** The cursor goes straight into a `::timestamp` cast, so anything malformed is rejected first. */
function toSiteActivityCursor(cursor: SiteActivityCursor | null): SiteActivityCursor | null {
  if (cursor === null) return null
  if (
    typeof cursor.at !== "string" ||
    typeof cursor.key !== "string" ||
    !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d{1,6})?$/.test(cursor.at)
  ) {
    throw new Error("Couldn't load more activity.")
  }
  return { at: cursor.at, key: cursor.key }
}
