import { useState } from "react"

import { Button } from "@/components/ui/button"

import { beginGoogleLogin } from "../-functions/begin-google-login"
import { getPostHogSessionId } from "../../../-lib/utils"

export function GoogleLoginButton({ next }: { next?: string }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>()

  async function handleClick() {
    setIsLoading(true)
    setError(undefined)

    try {
      const { url } = await beginGoogleLogin({
        data: { next, posthogSessionId: await getPostHogSessionId() },
      })
      window.location.href = url
    } catch (error) {
      // Leaving the button disabled here would strand the user with no way to retry.
      console.error("GoogleLoginButton: beginGoogleLogin failed", error)
      setError("Couldn't start Google login. Please try again.")
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
        <GoogleIcon />
        Continue with Google
      </Button>
      {error ? <p className="text-destructive text-sm">{error}</p> : null}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.78-2.4 3.63v3.02h3.88c2.27-2.09 3.57-5.17 3.57-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3.02c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.11C3.25 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.37-2.28V6.61H1.27A11.98 11.98 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.61l4 3.11C6.22 6.88 8.87 4.77 12 4.77Z"
      />
    </svg>
  )
}
