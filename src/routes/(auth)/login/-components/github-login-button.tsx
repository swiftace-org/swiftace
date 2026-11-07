import { useState } from "react"

import { Button } from "@/components/ui/button"

import { beginGithubLogin } from "../-functions/begin-github-login"
import { getPostHogSessionId } from "../../../-lib/utils"

export function GitHubLoginButton({ next }: { next?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function handleClick() {
    setIsLoading(true)
    setError(undefined)

    try {
      const { url } = await beginGithubLogin({
        data: { next, posthogSessionId: await getPostHogSessionId() },
      })
      window.location.href = url
    } catch (error) {
      // Leaving the button disabled here would strand the user with no way to retry.
      console.error("GitHubLoginButton: beginGithubLogin failed", error)
      setError("Couldn't start GitHub login. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleClick}
        disabled={isLoading}
      >
        <GitHubIcon />
        Continue with GitHub
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-4" aria-hidden="true">
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.78-.25.78-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.16.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18.92-.26 1.91-.38 2.9-.39.98.01 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14 0 1.55-.01 2.79-.01 3.17 0 .3.21.66.79.55A10.53 10.53 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5Z" />
    </svg>
  )
}
