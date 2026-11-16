import { CircleAlertIcon, CircleCheckIcon, LoaderCircleIcon } from "lucide-react"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/toast"
import { formatRelativeTime, toSubmitErrorMessage } from "@/lib/utils"
import type { UpdateOverview, UpdateProgress, UpdateRequest, UpdateStatus } from "@/types/updates"

import { loadUpdateOverview } from "../-functions/load-update-overview"
import { submitUpdateRequest } from "../-functions/submit-update-request"
import { submitUpdateSettings } from "../-functions/submit-update-settings"
import { UPDATE_POLL_INTERVAL_MS, UPDATE_TIMEOUT_MS } from "../-lib/constants"
import { toUpdateProgress } from "../-lib/utils"
import { compareVersions } from "../../../../../cli/versions"

/**
 * The update restarts the server, so the page polls through it: a failed request just means it's
 * still restarting, and a new version answering means it's done.
 */
export function UpdateSettings() {
  const [overview, setOverview] = useState<UpdateOverview>()
  const [request, setRequest] = useState<UpdateRequest>()
  const [progress, setProgress] = useState<UpdateProgress>()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRequesting, setIsRequesting] = useState(false)
  const [isSavingAutoUpdate, setIsSavingAutoUpdate] = useState(false)
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    loadUpdateOverview().then(
      (next) => {
        if (cancelled) return
        setOverview(next)
        // So reopening the page mid-update, including one the daily timer started, follows it,
        // unless the new version is already what answered and the updater is just finishing up.
        if (next.status?.state === "running" && next.status.fromVersion === next.currentVersion) {
          setRequest({ requestedAt: next.status.startedAt, fromVersion: next.status.fromVersion })
        }
      },
      (error: unknown) => {
        if (!cancelled) setError(toSubmitErrorMessage(error, "Couldn't check for updates."))
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!request) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    async function poll() {
      const next = await loadUpdateOverview().catch(() => undefined)
      if (cancelled || !request) return
      // Up but refusing this page's call means a new build whose server function ids differ, so
      // only a fresh page can ask; it picks the update up again from the status file.
      if (!next && (await isServerUp())) return window.location.reload()
      if (next) setOverview(next)
      const current = toUpdateProgress(request, next, Date.now())
      setProgress(current)
      if (current.phase === "updated") {
        toast.add({ type: "success", description: `Updated to SwiftAce ${current.version}!` })
        // The new release's scripts and styles only arrive with a fresh page.
        timer = setTimeout(() => window.location.reload(), 1500)
      } else if (["waiting", "installing", "restarting"].includes(current.phase)) {
        timer = setTimeout(poll, UPDATE_POLL_INTERVAL_MS)
      } else {
        setRequest(undefined)
      }
    }
    timer = setTimeout(poll, UPDATE_POLL_INTERVAL_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [request])

  async function handleUpdate() {
    if (!overview) return
    setIsConfirming(false)
    setIsRequesting(true)
    setError(undefined)
    setProgress(undefined)
    try {
      const result = await submitUpdateRequest()
      if ("error" in result) {
        setError(result.error)
        return
      }
      setProgress({ phase: "waiting" })
      setRequest({ requestedAt: result.requestedAt, fromVersion: overview.currentVersion })
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to start the update."))
    } finally {
      setIsRequesting(false)
    }
  }

  async function handleAutoUpdateChange(autoUpdate: boolean) {
    setIsSavingAutoUpdate(true)
    setError(undefined)
    try {
      const result = await submitUpdateSettings({ data: { values: { autoUpdate } } })
      if ("error" in result) {
        setError(result.error)
        return
      }
      setOverview((current) => current && { ...current, ...result.settings })
      toast.add({
        type: "success",
        description: `Automatic updates turned ${result.settings.autoUpdate ? "on" : "off"}.`,
      })
    } catch (error) {
      setError(toSubmitErrorMessage(error, "Failed to save the update settings."))
    } finally {
      setIsSavingAutoUpdate(false)
    }
  }

  const isUpdating = Boolean(request)
  const isNewer =
    overview?.latestVersion != null &&
    compareVersions(overview.latestVersion, overview.currentVersion) > 0

  return (
    <section className="space-y-5" aria-labelledby="config-updates-heading">
      <UpdateSettingsHeader />
      {overview ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">SwiftAce {overview.currentVersion}</p>
              <VersionSummary overview={overview} isNewer={isNewer} />
              {!isUpdating && overview.status && <LastUpdate status={overview.status} />}
            </div>
            {overview.canUpdate && (isNewer || isUpdating) && (
              <Button
                type="button"
                className="shrink-0"
                disabled={isRequesting || isUpdating}
                onClick={() => setIsConfirming(true)}
              >
                {isUpdating && <LoaderCircleIcon className="animate-spin" />}
                {isUpdating ? "Updating..." : isRequesting ? "Starting..." : "Update now"}
              </Button>
            )}
          </div>
          {isUpdating && (
            <UpdateProgressNote progress={progress} version={overview.latestVersion} />
          )}
          <FieldError>{error ?? toProgressError(progress)}</FieldError>
          <Field orientation="horizontal">
            <Switch
              id="config-auto-update"
              checked={overview.canUpdate && overview.autoUpdate}
              disabled={!overview.canUpdate || isSavingAutoUpdate}
              onCheckedChange={(checked) => void handleAutoUpdateChange(checked)}
            />
            <FieldContent>
              <FieldLabel htmlFor="config-auto-update">Update automatically</FieldLabel>
              <FieldDescription>
                {overview.canUpdate
                  ? "Checks for a new release once a day and installs it. The site restarts while it updates, and is unreachable for a few seconds."
                  : "This server wasn't set up with swiftace deploy, so it can't update itself. Run swiftace upgrade, then restart it."}
              </FieldDescription>
            </FieldContent>
          </Field>
        </>
      ) : error ? (
        <FieldError>{error}</FieldError>
      ) : (
        <UpdateSettingsPending />
      )}
      <Dialog open={isConfirming} onOpenChange={setIsConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update to SwiftAce {overview?.latestVersion}?</DialogTitle>
            <DialogDescription>
              The server downloads the release, migrates the database and restarts. The site is
              unreachable for a few seconds while it restarts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button type="button" onClick={() => void handleUpdate()}>
              Update now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  )
}

/** `/status` answers without the session or the database, from any build. */
async function isServerUp(): Promise<boolean> {
  return fetch("/status", { cache: "no-store" }).then(
    (response) => response.ok,
    () => false,
  )
}

function UpdateSettingsHeader() {
  return (
    <div className="space-y-1">
      <h2 id="config-updates-heading" className="text-base font-semibold">
        Updates
      </h2>
      <p className="text-sm text-muted-foreground">The release of SwiftAce this site runs.</p>
    </div>
  )
}

function VersionSummary({ overview, isNewer }: { overview: UpdateOverview; isNewer: boolean }) {
  if (overview.checkError) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CircleAlertIcon className="size-4 shrink-0" />
        {overview.checkError}
      </p>
    )
  }
  if (!isNewer) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <CircleCheckIcon className="size-4 shrink-0 text-primary" />
        You&apos;re on the latest version.
      </p>
    )
  }
  return (
    <p className="text-sm text-muted-foreground">SwiftAce {overview.latestVersion} is available.</p>
  )
}

function LastUpdate({ status }: { status: UpdateStatus }) {
  const when = formatRelativeTime(status.finishedAt ?? status.startedAt)
  if (status.state === "failed") {
    return (
      <p className="text-sm text-destructive">
        The last update, {when}, failed: {status.error}
      </p>
    )
  }
  if (status.state === "updated") {
    return (
      <p className="text-sm text-muted-foreground">
        Updated from {status.fromVersion} {when}.
      </p>
    )
  }
  if (status.state === "upToDate") {
    return <p className="text-sm text-muted-foreground">Last checked {when}.</p>
  }
  return null
}

function UpdateProgressNote({
  progress,
  version,
}: {
  progress: UpdateProgress | undefined
  version: string | null
}) {
  const step =
    progress?.phase === "installing"
      ? `Installing SwiftAce ${version ?? "the latest release"}...`
      : progress?.phase === "restarting"
        ? "Restarting..."
        : "Starting the update..."
  return (
    <output className="block text-sm text-muted-foreground">
      {step} The site restarts during the update, so it may not load for a few seconds. This page
      reloads once it&apos;s done.
    </output>
  )
}

function toProgressError(progress: UpdateProgress | undefined): string | undefined {
  if (progress?.phase === "stalled") {
    return "The updater didn't start. Run sudo swiftace deploy on the server once to install it, then try again."
  }
  if (progress?.phase === "timedOut") {
    return `The update hasn't finished after ${UPDATE_TIMEOUT_MS / 60_000} minutes. See journalctl -u swiftace-update on the server.`
  }
}

function UpdateSettingsPending() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5 w-56" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-5 w-9" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
    </div>
  )
}
