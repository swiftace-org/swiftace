import { createServerFn } from "@tanstack/react-start"
import { generateCodeVerifier, generateState } from "arctic"

import { integrationMiddleware } from "@/lib/utils"
import { getSiteUrl } from "@/lib/utils.server"

import { sanitizeNextUrl } from "../../-lib/utils"
import { createGoogleOAuthClient, setOAuthStateCookie } from "../../-lib/utils.server"

const GOOGLE_SCOPES = ["openid", "email", "profile"]

export const beginGoogleLogin = createServerFn({ method: "POST" })
  .middleware([integrationMiddleware("googleLogin")])
  .validator((data: { next?: string; posthogSessionId?: string }) => data)
  .handler(async ({ data }) => {
    const state = generateState()
    const codeVerifier = generateCodeVerifier()
    const redirectUri = `${getSiteUrl()}/google/auth`

    const url = (await createGoogleOAuthClient(redirectUri)).createAuthorizationURL(
      state,
      codeVerifier,
      GOOGLE_SCOPES,
    )
    setOAuthStateCookie({
      provider: "google",
      state,
      codeVerifier,
      next: sanitizeNextUrl(data.next),
      posthogSessionId: data.posthogSessionId,
    })

    return { url: url.toString() }
  })
