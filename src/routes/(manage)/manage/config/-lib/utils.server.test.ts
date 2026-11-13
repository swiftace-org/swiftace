import { describe, expect, it } from "vite-plus/test"

import { DEFAULT_INTEGRATION_SETTINGS } from "@/lib/config"
import type { IntegrationSettings } from "@/types/site-config"

import { toAdminIntegrationSettings, toIntegrationSettings } from "./utils.server"

const stored: IntegrationSettings = {
  ...DEFAULT_INTEGRATION_SETTINGS,
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

describe("service configuration", () => {
  const email = {
    enabled: true,
    region: "us-east-1",
    accessKeyId: "ses-id",
    secretAccessKey: "ses-secret",
    fromEmail: "notify@example.com",
  }
  const objectStorage = {
    enabled: true,
    endpoint: "https://s3.example.com",
    region: "us-east-1",
    accessKeyId: "s3-id",
    secretAccessKey: "s3-secret",
    bucket: "assets",
  }

  it("masks SES and storage credentials and preserves them on a blank submission", () => {
    const configured = { ...stored, email, objectStorage }
    const admin = toAdminIntegrationSettings(configured)
    expect(admin.integrations.email.accessKeyId).toBe("")
    expect(admin.integrations.email.secretAccessKey).toBe("")
    expect(admin.integrations.objectStorage.accessKeyId).toBe("")
    expect(admin.integrations.objectStorage.secretAccessKey).toBe("")
    expect(admin.savedSecrets).toEqual(
      expect.arrayContaining([
        "email.accessKeyId",
        "email.secretAccessKey",
        "objectStorage.accessKeyId",
        "objectStorage.secretAccessKey",
      ]),
    )
    const result = toIntegrationSettings({ email: admin.integrations.email }, configured)
    if ("error" in result) throw new Error(result.error)
    expect(result.settings.email).toEqual(email)
    expect(result.settings.objectStorage).toEqual(objectStorage)
    expect(result.settings.billing).toEqual(stored.billing)
  })

  it("requires SES credentials and a valid sender when enabled", () => {
    expect(
      toIntegrationSettings({ email: { ...email, secretAccessKey: "" } }, stored),
    ).toHaveProperty("error")
    expect(
      toIntegrationSettings({ email: { ...email, fromEmail: "invalid" } }, stored),
    ).toHaveProperty("error")
    expect(
      toIntegrationSettings({ objectStorage: { ...objectStorage, bucket: "" } }, stored),
    ).toHaveProperty("error")
  })

  it("requires a separate preview URL only while enabled", () => {
    expect(
      toIntegrationSettings({ notebookPreview: { enabled: true, url: "" } }, stored),
    ).toHaveProperty("error")
    expect(
      toIntegrationSettings({ notebookPreview: { enabled: false, url: "" } }, stored),
    ).toHaveProperty("settings")
    expect(
      toIntegrationSettings(
        { notebookPreview: { enabled: true, url: "https://academy.example/preview" } },
        stored,
        "https://academy.example",
      ),
    ).toHaveProperty("error")
    expect(
      toIntegrationSettings(
        { notebookPreview: { enabled: true, url: "https://preview.example/" } },
        stored,
        "https://academy.example",
      ),
    ).toMatchObject({
      settings: { notebookPreview: { enabled: true, url: "https://preview.example" } },
    })
  })

  it("allows loopback HTTP for development and rejects insecure remote and credential-bearing URLs", () => {
    expect(
      toIntegrationSettings(
        { objectStorage: { ...objectStorage, endpoint: "http://127.0.0.1:4100" } },
        stored,
      ),
    ).toHaveProperty("settings")
    expect(
      toIntegrationSettings(
        { notebookPreview: { enabled: true, url: "http://localhost:4100" } },
        stored,
      ),
    ).toHaveProperty("settings")
    for (const endpoint of [
      "http://s3.example.com",
      "https://user:pass@s3.example.com",
      "javascript:alert(1)",
    ]) {
      expect(
        toIntegrationSettings({ objectStorage: { ...objectStorage, endpoint } }, stored),
      ).toHaveProperty("error")
    }
  })
})
