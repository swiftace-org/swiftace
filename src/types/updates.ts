/** Saved on `/manage/config`, and read by `swiftace update` when its daily timer runs it. */
export type UpdateSettings = { autoUpdate: boolean }

/** What `swiftace update` last did, written by it as root for `/manage/config` to show. */
export type UpdateStatus = {
  state: "running" | "upToDate" | "updated" | "failed"
  /** ISO timestamps, from the same clock as the app's, since both run on the one server. */
  startedAt: string
  finishedAt?: string
  fromVersion: string
  /** The release it found to be the latest, once it's looked. */
  version?: string
  error?: string
}

export type UpdateOverview = {
  currentVersion: string
  /** Null when the releases couldn't be reached, with `checkError` saying why. */
  latestVersion: string | null
  checkError?: string
  /** Whether `swiftace deploy` installed the updater, which this page asks for an update. */
  canUpdate: boolean
  status: UpdateStatus | null
  autoUpdate: boolean
}

/** An update this page asked for, or found running, and is waiting on. */
export type UpdateRequest = { requestedAt: string; fromVersion: string }

/** Where a requested update has got to, from what the page last heard. */
export type UpdateProgress =
  | { phase: "waiting" | "installing" | "restarting" }
  | { phase: "updated"; version: string }
  | { phase: "upToDate" }
  | { phase: "failed"; error: string }
  | { phase: "stalled" | "timedOut" }
