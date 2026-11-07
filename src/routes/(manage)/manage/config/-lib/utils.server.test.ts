import { describe, expect, it } from "vite-plus/test"

import type { IntegrationSettings } from "@/types/site-config"

import { toAdminIntegrationSettings, toIntegrationSettings } from "./utils.server"

const stored: IntegrationSettings = {
  googleLogin: { enabled: true, clientId: "google-id", clientSecret: "google-secret" },
  githubLogin: { enabled: false, clientId: "", clientSecret: "" },
  billing: {
    enabled: true,
    stripeSecretKey: "sk_live_123",
    stripeWebhookSecret: "whsec_123",
    monthlyPriceId: "price_month",
    annualPriceId: "price_year",
  },
  turnstile: { enabled: true, siteKey: "site-key", secretKey: "turnstile-secret" },
  posthog: { enabled: false, projectToken: "", host: "https://us.i.posthog.com" },
  openai: { enabled: true, apiKey: "sk-proj-123" },
}

describe("integration secrets", () => {
  it("blanks every secret for the page and names the saved ones", () => {
    const { integrations, savedSecrets } = toAdminIntegrationSettings(stored)

    expect(JSON.stringify(integrations)).not.toMatch(
      /google-secret|sk_live|whsec_|turnstile-secret|sk-proj/,
    )
    expect(integrations.googleLogin.clientId).toBe("google-id")
    expect(integrations.billing.monthlyPriceId).toBe("price_month")
    expect([...savedSecrets].sort()).toEqual([
      "billing.stripeSecretKey",
      "billing.stripeWebhookSecret",
      "googleLogin.clientSecret",
      "openai.apiKey",
      "turnstile.secretKey",
    ])
  })

  it("keeps a saved secret the form left blank, and replaces one it filled in", () => {
    const { integrations } = toAdminIntegrationSettings(stored)
    const values = {
      ...integrations,
      turnstile: { ...integrations.turnstile, secretKey: "  new-secret  " },
    }

    const result = toIntegrationSettings(values, stored)
    if ("error" in result) throw new Error(result.error)
    expect(result.settings.googleLogin.clientSecret).toBe("google-secret")
    expect(result.settings.billing.stripeSecretKey).toBe("sk_live_123")
    expect(result.settings.turnstile.secretKey).toBe("new-secret")
    expect(result.settings.openai.apiKey).toBe("sk-proj-123")
  })

  it("won't switch an integration on until every field is filled in", () => {
    const { integrations } = toAdminIntegrationSettings(stored)
    const values = { ...integrations, githubLogin: { ...integrations.githubLogin, enabled: true } }

    expect(toIntegrationSettings(values, stored)).toEqual({
      error: "Enter the Client ID for GitHub login before turning it on.",
    })
  })

  it("always lets an integration be switched off", () => {
    const empty = toAdminIntegrationSettings({
      ...stored,
      billing: { ...stored.billing, stripeSecretKey: "", stripeWebhookSecret: "" },
    }).integrations
    const values = { ...empty, billing: { ...empty.billing, enabled: false } }

    expect("settings" in toIntegrationSettings(values, { ...stored, billing: empty.billing })).toBe(
      true,
    )
  })

  it("catches a key pasted into the wrong field", () => {
    const { integrations } = toAdminIntegrationSettings(stored)
    const values = {
      ...integrations,
      billing: { ...integrations.billing, monthlyPriceId: "prod_123" },
    }

    expect(toIntegrationSettings(values, stored)).toEqual({
      error: "Billing's Monthly price ID should start with price_.",
    })
  })
})
