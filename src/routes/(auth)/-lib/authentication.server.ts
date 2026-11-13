import type { AuthenticationKeys } from "@/types/account"

import { readAuthenticationKeys } from "./db.server"

let keys: Promise<AuthenticationKeys> | undefined

/** Keys are stable for the process lifetime; deliberate database rotation requires a restart. */
export function getAuthenticationKeys(): Promise<AuthenticationKeys> {
  if (keys) return keys
  keys = readAuthenticationKeys()
    .then((data) => {
      if (
        !data ||
        typeof data !== "object" ||
        !("signingKey" in data) ||
        typeof data.signingKey !== "string" ||
        !data.signingKey.trim() ||
        !("hashKey" in data) ||
        typeof data.hashKey !== "string" ||
        !data.hashKey.trim()
      ) {
        throw new Error("Authentication keys are missing. Run swiftace migrate or swiftace deploy.")
      }
      return { signingKey: data.signingKey, hashKey: data.hashKey }
    })
    .catch((error) => {
      keys = undefined
      throw error
    })
  return keys
}
