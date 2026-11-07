const NEXT_URL_BASE = "http://next.invalid"

const AUTH_PATH_PATTERN = /^\/(login|signup|google\/auth|github\/auth)(\/|$)/

/**
 * `?next=` is attacker-controlled, so only a same-origin path survives: anything resolving to
 * another host (`//evil.com`, `/\evil.com`) would turn every login into an open redirect.
 */
export function sanitizeNextUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) return undefined

  let url: URL
  try {
    url = new URL(value, NEXT_URL_BASE)
  } catch {
    return undefined
  }
  if (url.origin !== NEXT_URL_BASE) return undefined

  const path = `${url.pathname}${url.search}${url.hash}`
  // An auth page as `next` would bounce a signed-in user straight back into the login flow.
  if (path.startsWith("//") || AUTH_PATH_PATTERN.test(url.pathname)) return undefined
  return path
}
