import { createServerFn } from "@tanstack/react-start"
import { generateState } from "arctic"

import { integrationMiddleware } from "@/lib/utils"
import { getSiteUrl } from "@/lib/utils.server"

import { sanitizeNextUrl } from "../../-lib/utils"
import { createGitHubOAuthClient, setOAuthStateCookie } from "../../-lib/utils.server"

const GITHUB_SCOPES = ["user:email"]

export const beginGithubLogin = createServerFn({ method: "POST" })
  .middleware([integrationMiddleware("githubLogin")])
  .validator((data: { next?: string; posthogSessionId?: string }) => data)
  .handler(async ({ data }) => {
    const state = generateState()
    const redirectUri = `${getSiteUrl()}/github/auth`

    const url = (await createGitHubOAuthClient(redirectUri)).createAuthorizationURL(
      state,
      GITHUB_SCOPES,
    )
    setOAuthStateCookie({
      provider: "github",
      state,
      next: sanitizeNextUrl(data.next),
      posthogSessionId: data.posthogSessionId,
    })

    return { url: url.toString() }
  })
