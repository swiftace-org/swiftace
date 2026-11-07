// The service's env file, /etc/swiftace.env, which `swiftace deploy` creates: the variables in
// REQUIRED_VARIABLES, readable only by root and loaded by systemd.
import { randomBytes } from "node:crypto"
import { lstat, readFile, rename, rm, writeFile } from "node:fs/promises"

import { REQUIRED_VARIABLES } from "./environment.ts"
import { fail } from "./shell.ts"

/** Its variables as systemd reads them: the last line for a name wins, and quotes are dropped. */
export function parseEnvFile(text: string): Map<string, string> {
  const variables = new Map<string, string>()
  for (const line of text.split("\n")) {
    const [, name, value] = /^\s*([A-Za-z_]\w*)=(.*)$/.exec(line) ?? []
    if (name !== undefined && value !== undefined) {
      variables.set(name, value.trim().replace(/^(["'])(.*)\1$/, "$2"))
    }
  }
  return variables
}

/**
 * The file with a line added for each required variable it doesn't mention, leaving every line it
 * has alone. The secrets are generated; the rest are left for the admin, except the preview URL.
 */
export function withRequiredVariables(text: string, previewDomain?: string): string {
  const present = parseEnvFile(text)
  const added = REQUIRED_VARIABLES.filter((name) => !present.has(name)).map((name) => {
    if (name === "JWT_SECRET_KEY" || name === "HASH_SECRET_KEY") {
      return `${name}=${randomBytes(32).toString("hex")}`
    }
    if (name === "NOTEBOOK_PREVIEW_URL" && previewDomain) return `${name}=https://${previewDomain}`
    return `${name}=`
  })
  if (!added.length) return text
  const header = text
    ? ""
    : "# SwiftAce's environment, loaded by swiftace.service. See `swiftace help` for each variable.\n"
  const body = text && !text.endsWith("\n") ? `${text}\n` : text
  return `${header}${body}${added.join("\n")}\n`
}

/** Creates the file, or adds the variables it's missing, keeping it root-only throughout. */
export async function ensureEnvFile(path: string, previewDomain?: string) {
  const stats = await lstat(path).catch(() => null)
  if (stats && !stats.isFile()) fail(`${path} should be a file, not a link or a folder`)
  const text = stats ? await readFile(path, "utf8") : ""
  const updated = withRequiredVariables(text, previewDomain)
  if (stats && updated === text) return { created: false, variables: parseEnvFile(text) }

  const tmp = `${path}.${process.pid}.tmp`
  await rm(tmp, { force: true })
  // Created afresh (wx), so it has the mode from the start.
  await writeFile(tmp, updated, { mode: 0o600, flag: "wx" })
  await rename(tmp, path)
  return { created: !stats, variables: parseEnvFile(updated) }
}
