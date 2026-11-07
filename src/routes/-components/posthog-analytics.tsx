import { useRouteContext } from "@tanstack/react-router"
import { useEffect } from "react"

import { getCachedSiteConfig } from "@/lib/utils"

import { loadPostHog } from "../-lib/utils"

const POSTHOG_OFF = { enabled: false, projectToken: "", host: "" }

/** Starts PostHog in the browser and ties its events to whoever is signed in. */
export function PostHogAnalytics() {
  const { account, siteConfig } = useRouteContext({ from: "__root__" })
  // Not `useSiteConfig`: the shell renders this even when the root `beforeLoad` failed.
  const posthog = (siteConfig ?? getCachedSiteConfig())?.integrations.posthog
  const { enabled, projectToken, host } = posthog ?? POSTHOG_OFF

  useEffect(() => {
    // `undefined` is the blank context mid-`beforeLoad`, not a sign-out.
    if (!enabled || account === undefined) return
    void loadPostHog({ enabled, projectToken, host }).then((client) => {
      if (account) {
        client.identify(String(account.id), {
          email: account.email,
          name: account.name,
          username: account.username,
        })
      } else if (client.get_property("$user_state") === "identified") {
        // Without this, the next visitor on a shared browser is recorded as the last account.
        client.reset()
      }
    })
  }, [account, enabled, projectToken, host])

  return null
}
