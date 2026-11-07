// `swiftace upgrade [version] [-y]`: replaces this binary with the latest release, or the given
// one, from GitHub, checked against the release's SHA256SUMS. Migrating the database and
// restarting the server are left to `swiftace deploy` (or whatever runs it).
import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { access, chmod, constants, rm, writeFile, rename } from "node:fs/promises"
import { dirname } from "node:path"

import { DOMAINS_FILE } from "./paths.ts"
import { confirm, fail, IS_BINARY, VERSION } from "./shell.ts"
import { compareVersions, parseVersion } from "./versions.ts"

const DEFAULT_RELEASES_URL = "https://github.com/swiftace-org/swiftace/releases"
/** The platforms there's a release binary for, swiftace-<platform>-<arch>. */
export const TARGETS = ["linux-x64", "linux-arm64", "darwin-x64", "darwin-arm64"]

export async function upgrade(requested: string | undefined, yes: boolean) {
  if (!IS_BINARY) fail("upgrade replaces the built binary. In a checkout, pull and build instead.")
  const target = `${process.platform}-${process.arch}`
  if (!TARGETS.includes(target)) fail(`There are no releases for ${target}`)
  const releases = (process.env.SWIFTACE_RELEASES_URL?.trim() || DEFAULT_RELEASES_URL).replace(
    /\/+$/,
    "",
  )

  const version = (requested ?? (await latestTag(releases))).replace(/^v/, "")
  if (!parseVersion(version)) fail(`Not a release: ${version}`)
  const order = compareVersions(version, VERSION)
  if (order === 0 || (order < 0 && requested === undefined)) {
    return console.log(`SwiftAce ${VERSION} is up to date`)
  }
  if (order < 0) {
    fail(`${version} is older than ${VERSION}, and might not work with the database it migrated`)
  }

  const binary = process.execPath
  await access(dirname(binary), constants.W_OK).catch(() =>
    fail(`Can't replace ${binary}. Run it as a user who can, e.g. with sudo.`),
  )
  if (!yes && !(await confirm(`Replace SwiftAce ${VERSION} at ${binary} with ${version}?`))) {
    fail("Cancelled")
  }

  const asset = `swiftace-${target}`
  const releaseUrl = `${releases}/download/v${version}`
  console.log(`Downloading ${releaseUrl}/${asset}...`)
  const sums = new TextDecoder().decode(await download(`${releaseUrl}/SHA256SUMS`))
  const expected = findChecksum(sums, asset)
  if (!expected) fail(`${version}'s SHA256SUMS doesn't list ${asset}`)
  const bytes = await download(`${releaseUrl}/${asset}`)
  if (createHash("sha256").update(bytes).digest("hex") !== expected) {
    fail(`The downloaded ${asset} doesn't match ${version}'s SHA256SUMS`)
  }

  // Written beside it and moved into place, so a running server keeps its copy.
  const tmp = `${binary}.${process.pid}.tmp`
  try {
    await writeFile(tmp, bytes, { mode: 0o755 })
    await chmod(tmp, 0o755)
    await rename(tmp, binary)
  } finally {
    await rm(tmp, { force: true })
  }
  console.log(`Upgraded SwiftAce ${VERSION} to ${version}`)
  console.log(
    existsSync(DOMAINS_FILE)
      ? "Run sudo swiftace deploy to migrate the database and restart the service with it"
      : "Run swiftace migrate, then restart SwiftAce to run it",
  )
}

/** sha256sum writes "<hash>  <name>", or "<hash> *<name>" for a file it read as binary. */
export function findChecksum(sums: string, asset: string): string | undefined {
  return sums
    .split("\n")
    .map((line) => line.trim().split(/\s+\*?/))
    .find(([, name]) => name === asset)?.[0]
}

/** The latest release's tag, from where GitHub sends /releases/latest (/releases/tag/<tag>). */
async function latestTag(releases: string): Promise<string> {
  const url = `${releases}/latest`
  const response = await fetch(url, { redirect: "manual" }).catch((error: Error) =>
    fail(`Couldn't reach ${url}: ${error.message}`),
  )
  const tag = /\/releases\/tag\/([^/?#]+)$/.exec(response.headers.get("location") ?? "")?.[1]
  if (!tag) fail(`Couldn't find the latest release at ${url}`)
  return decodeURIComponent(tag)
}

async function download(url: string): Promise<Uint8Array> {
  const response = await fetch(url).catch((error: Error) =>
    fail(`Couldn't reach ${url}: ${error.message}`),
  )
  if (!response.ok) fail(`Couldn't download ${url}: HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}
