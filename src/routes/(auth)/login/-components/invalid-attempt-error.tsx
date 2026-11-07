import { BlueLink } from "@/components/blue-link"
import { useSiteConfig } from "@/lib/hooks"

export function InvalidAttemptError({ message, next }: { message?: string; next?: string }) {
  const { siteName } = useSiteConfig().general
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-4 text-center">
        <h1 className="text-3xl font-semibold">Log In to {siteName}</h1>
        <p className="text-sm text-muted-foreground">
          {message ?? "Invalid or expired verification link."}
        </p>
        <BlueLink to="/login" search={{ next }}>
          ← Back to login
        </BlueLink>
      </div>
    </main>
  )
}
