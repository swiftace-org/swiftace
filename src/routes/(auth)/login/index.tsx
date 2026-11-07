import { createFileRoute } from "@tanstack/react-router"

import { BlueLink } from "@/components/blue-link"
import { useSiteConfig } from "@/lib/hooks"

import { EmailLoginForm } from "./-components/email-login-form"
import { GitHubLoginButton } from "./-components/github-login-button"
import { GoogleLoginButton } from "./-components/google-login-button"
import { OrSeparator } from "./-components/or-separator"

export const Route = createFileRoute("/(auth)/login/")({
  component: LoginPage,
})

function LoginPage() {
  const { next } = Route.useSearch()
  const { googleLogin, githubLogin } = useSiteConfig().integrations

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-xs space-y-6">
        <h1 className="text-center text-3xl font-semibold">Log In or Sign Up</h1>
        <EmailLoginForm next={next} />
        {(googleLogin.enabled || githubLogin.enabled) && (
          <>
            <OrSeparator />
            <div className="space-y-4">
              {googleLogin.enabled && <GoogleLoginButton next={next} />}
              {githubLogin.enabled && <GitHubLoginButton next={next} />}
            </div>
          </>
        )}
        <p className="text-sm text-muted-foreground text-center">
          By continuing you agree to our{" "}
          <BlueLink colored to="/terms-of-service.html">
            Terms of Service
          </BlueLink>{" "}
          and{" "}
          <BlueLink colored to="/privacy-policy.html">
            Privacy Policy
          </BlueLink>
          .
        </p>
      </div>
    </main>
  )
}
