import { createServerFn } from "@tanstack/react-start"

import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/config"
import { adminMiddleware } from "@/lib/utils"
import { getSiteConfig } from "@/lib/utils.server"
import type { ManageUsersPage, ManageUsersSearch, UserEnrollmentSummary } from "@/types/user"

import {
  readCurrentSubscriptions,
  readLastActiveAt,
  readEnrollmentsForAccounts,
  readManagedUsers,
  readManagedUsersCount,
} from "../-lib/db.server"
import { toSubscriptionPlan, toSubscriptionSummary } from "../-lib/utils.server"

/** One page of every account on the site, filtered, sorted and paged in the database. */
export const loadManageUsers = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator((data: ManageUsersSearch) => data)
  .handler(async ({ data }): Promise<ManageUsersPage> => {
    const filter = { search: data.q.trim(), role: data.role }

    const [totalUsers, users] = await Promise.all([
      readManagedUsersCount(filter),
      readManagedUsers(filter, {
        sort: data.sort,
        order: data.order,
        limit: data.perPage,
        offset: (data.page - 1) * data.perPage,
      }),
    ])

    const accountIds = users.map((user) => user.id)
    const [enrollments, subscriptions, lastActive] = await Promise.all([
      readEnrollmentsForAccounts(accountIds),
      readCurrentSubscriptions(accountIds),
      readLastActiveAt(accountIds),
    ])
    const enrollmentsByAccount = new Map<number, UserEnrollmentSummary[]>()
    for (const { accountId, ...enrollment } of enrollments) {
      const list = enrollmentsByAccount.get(accountId) ?? []
      list.push(enrollment)
      enrollmentsByAccount.set(accountId, list)
    }

    const { billing } = (await getSiteConfig()).integrations
    return {
      users: users.map((user) => {
        const held = subscriptions.filter((subscription) => subscription.accountId === user.id)
        // A failed renewal only shows when nothing else grants access, so it can't mask a live plan.
        const live = held.filter((subscription) =>
          ACTIVE_SUBSCRIPTION_STATUSES.includes(subscription.status),
        )
        const shown = live.length ? live : held
        return {
          ...user,
          enrollments: enrollmentsByAccount.get(user.id) ?? [],
          lastActiveAt: lastActive.get(user.id) ?? user.createdAt,
          plan: toSubscriptionPlan(
            shown.map((subscription) => subscription.stripePriceId),
            billing,
          ),
          subscription: toSubscriptionSummary(shown, !live.length),
        }
      }),
      totalUsers,
    }
  })
