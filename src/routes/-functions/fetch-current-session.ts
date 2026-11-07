import { createServerFn } from "@tanstack/react-start"

import {
  getCurrentAccount,
  getSiteConfig,
  readHasActiveSubscription,
  toPublicSiteConfig,
} from "@/lib/utils.server"
import type { CurrentSession } from "@/types/account"

/**
 * The signed-in account and whether they can enroll, for the root route's context. Returns a null
 * account when signed out rather than throwing, since most of the app is viewable logged out. The
 * subscription lookup and the site config ride along because the navbar needs them on every page.
 */
export const fetchCurrentSession = createServerFn({ method: "GET" }).handler(
  async (): Promise<CurrentSession> => {
    const [account, config] = await Promise.all([getCurrentAccount(), getSiteConfig()])
    const siteConfig = toPublicSiteConfig(config)
    if (!account) return { account: null, hasActiveSubscription: false, siteConfig }

    const hasActiveSubscription = await readHasActiveSubscription(account.id)
    return { account, hasActiveSubscription, siteConfig }
  },
)
