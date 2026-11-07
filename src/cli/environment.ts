// The environment variables the server reads. Everything else is set by an admin at
// /manage/config and kept in the database.
import { CommandError } from "./shell.ts"

/** What `src/lib/config.server.ts` refuses to run without, in the order `.env.example` has them. */
export const REQUIRED_VARIABLES = ["DATABASE_URL", "JWT_SECRET_KEY", "HASH_SECRET_KEY"] as const

export const DEFAULT_PORT = 4000
export const DEFAULT_PREVIEW_PORT = 4100

export function missingVariables(env: Record<string, string | undefined>): string[] {
  return REQUIRED_VARIABLES.filter((name) => !env[name]?.trim())
}

/** A port from the environment, or its default when it isn't set; 0 only where it's allowed. */
export function readPort(
  env: Record<string, string | undefined>,
  name: string,
  fallback: number,
  { allowZero = false } = {},
): number {
  const value = env[name]?.trim()
  if (!value) return fallback
  const port = /^\d{1,5}$/.test(value) ? Number(value) : NaN
  if (!(port <= 65535) || (port === 0 && !allowZero)) {
    throw new CommandError(`${name} should be a port number${allowZero ? ", or 0" : ""}: ${value}`)
  }
  return port
}
