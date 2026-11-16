// `swiftace update [--service]`: on a server `swiftace deploy` set up, installs the latest release
// and redeploys with it, as root. swiftace-update.service runs it with --service, both from its
// daily timer and when `/manage/config` creates the request file its path unit watches.
import { spawn } from "node:child_process"
import { existsSync } from "node:fs"
import { rename, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { sql } from "drizzle-orm"

import { UPDATE_REQUEST_FILE, UPDATE_STATUS_FILE } from "@/lib/config"
import type { UpdateStatus } from "@/types/updates"

import { commandDatabaseUrl, withDatabase } from "./migrations.ts"
import { BINARY_PATH, DOMAINS_FILE, STATE_DIR } from "./paths.ts"
import { CommandError, fail, IS_BINARY, VERSION } from "./shell.ts"
import { installRelease, latestVersion, releasesUrl } from "./upgrade.ts"
import { compareVersions } from "./versions.ts"

export async function update(fromService: boolean) {
  if (!IS_BINARY || !existsSync(DOMAINS_FILE)) {
    fail("update redeploys a server swiftace deploy set up: run swiftace deploy <domain> first")
  }
  if (process.getuid?.() !== 0) fail("Run it as root, e.g. with sudo")

  let requested = false
  if (fromService) {
    const requestFile = join(STATE_DIR, UPDATE_REQUEST_FILE)
    requested = existsSync(requestFile)
    // Removed first, since the path unit starts this again for as long as the file is there.
    await rm(requestFile, { force: true })
    if (!requested && !(await autoUpdateEnabled())) {
      return console.log("Automatic updates are off in /manage/config")
    }
  }

  const status: UpdateStatus = {
    state: "running",
    startedAt: new Date().toISOString(),
    fromVersion: VERSION,
  }
  const report = (change: Partial<UpdateStatus>) => writeStatus(Object.assign(status, change))
  await report({})
  try {
    const releases = releasesUrl()
    const version = await latestVersion(releases)
    await report({ version })
    const isNewer = compareVersions(version, VERSION) > 0
    // The page only asks when the server runs an older release, so an up-to-date binary here
    // means an earlier deploy of it failed, and deploying again is what's left to do.
    if (!isNewer && !requested) {
      console.log(`SwiftAce ${VERSION} is up to date`)
      return await report({ state: "upToDate", finishedAt: new Date().toISOString() })
    }
    if (isNewer) await installRelease(releases, version, BINARY_PATH)
    console.log(`Deploying SwiftAce ${isNewer ? version : VERSION}...`)
    // The new release's deploy, so its own migrations, service files and checks are what run.
    await deployWith(BINARY_PATH)
    await report({ state: "updated", finishedAt: new Date().toISOString() })
    console.log(`Deployed SwiftAce ${isNewer ? version : VERSION}`)
  } catch (error) {
    const message = error instanceof CommandError ? error.message : String(error)
    await report({ state: "failed", error: message, finishedAt: new Date().toISOString() })
    throw error
  }
}

async function autoUpdateEnabled(): Promise<boolean> {
  return withDatabase(await commandDatabaseUrl(), async (db) => {
    const { rows } = await db.execute<{ data: { autoUpdate?: unknown } }>(sql`
      select data from site_config where section = 'updates'
    `)
    return rows[0]?.data?.autoUpdate === true
  })
}

/**
 * Written beside the file and moved into place, so the app never reads half of it. Reporting is
 * best effort: the service hasn't made its state directory if it has never started.
 */
async function writeStatus(status: UpdateStatus) {
  if (!existsSync(STATE_DIR)) return
  const file = join(STATE_DIR, UPDATE_STATUS_FILE)
  const tmp = `${file}.${process.pid}.tmp`
  try {
    await writeFile(tmp, `${JSON.stringify(status)}\n`, { mode: 0o644 })
    await rename(tmp, file)
  } catch (error) {
    console.warn(`Couldn't write ${file}: ${(error as Error).message}`)
    await rm(tmp, { force: true })
  }
}

/** Runs `<binary> deploy` with the saved domains, its output going to this one's journal. */
async function deployWith(binary: string) {
  const { code, errors } = await new Promise<{ code: number | null; errors: string }>(
    (resolve, reject) => {
      let errors = ""
      const child = spawn(binary, ["deploy"], { stdio: ["ignore", "inherit", "pipe"] })
      child.stderr.on("data", (chunk: Buffer) => {
        process.stderr.write(chunk)
        errors += chunk
      })
      child.on("error", reject)
      child.on("close", (code) => resolve({ code, errors }))
    },
  )
  if (code === 0) return
  const reason = errors
    .trim()
    .split("\n")
    .reverse()
    .find((line) => line.startsWith("Error: "))
  fail(
    `${reason?.slice("Error: ".length) ?? "swiftace deploy failed"} ` +
      "(see journalctl -u swiftace-update)",
  )
}
