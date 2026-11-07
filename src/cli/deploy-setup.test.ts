import { randomUUID } from "node:crypto"

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres"
import pg from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { TerminalPrompt } from "@/types/cli"

import { collectDeploymentSetup, setupDeployment } from "./deploy-setup"

const email = {
  enabled: true,
  region: "eu-west-1",
  accessKeyId: "test-access-id",
  secretAccessKey: "test-secret-value",
  fromEmail: "notify@example.com",
}
const answers: Record<string, string> = {
  "Admin email address": " Admin@Example.com ",
  "SES AWS region": "eu-west-1",
  "SES access key ID": email.accessKeyId,
  "SES secret access key": email.secretAccessKey,
  "SES verified sender email address": email.fromEmail,
}
const ask = () => vi.fn<TerminalPrompt>(async (question) => answers[question] ?? "")

describe("deployment setup inputs", () => {
  it("collects initial admin and SES settings, marking both credentials as hidden", async () => {
    const prompt = ask()
    const input = await collectDeploymentSetup({ hasAdmin: false, email: {} }, prompt)
    expect(input).toEqual({ adminEmail: "admin@example.com", email })
    expect(prompt.mock.calls).toEqual([
      ["Admin email address"],
      ["SES AWS region", { defaultValue: "us-east-1" }],
      ["SES access key ID", { secret: true }],
      ["SES secret access key", { secret: true }],
      ["SES verified sender email address"],
    ])
  })

  it("skips already configured values and preserves a deliberately disabled email service", async () => {
    const prompt = ask()
    expect(
      await collectDeploymentSetup({ hasAdmin: true, email: { ...email, enabled: false } }, prompt),
    ).toEqual({})
    expect(prompt).not.toHaveBeenCalled()
  })

  it("enables already configured SES when creating the first admin, without re-asking its details", async () => {
    const prompt = ask()
    expect(
      await collectDeploymentSetup(
        { hasAdmin: false, email: { ...email, enabled: false } },
        prompt,
      ),
    ).toEqual({ adminEmail: "admin@example.com", email })
    expect(prompt.mock.calls).toEqual([["Admin email address"]])
  })

  it("only asks for missing SES fields", async () => {
    const prompt = ask()
    const input = await collectDeploymentSetup(
      { hasAdmin: true, email: { region: email.region, accessKeyId: email.accessKeyId } },
      prompt,
    )
    expect(input.email).toEqual(email)
    expect(prompt.mock.calls).toEqual([
      ["SES secret access key", { secret: true }],
      ["SES verified sender email address"],
    ])
  })

  it("uses the default AWS region when Enter is pressed", async () => {
    const prompt: TerminalPrompt = async (question) =>
      question === "SES AWS region" ? "" : (answers[question] ?? "")
    expect(
      (await collectDeploymentSetup({ hasAdmin: true, email: {} }, prompt)).email?.region,
    ).toBe("us-east-1")
  })

  it("rejects invalid admin email and incomplete SES credentials", async () => {
    for (const address of ["invalid", "first..last@example.com", ".first@example.com"]) {
      await expect(
        collectDeploymentSetup({ hasAdmin: false, email }, async () => address),
      ).rejects.toThrow("valid admin email")
    }
    await expect(
      collectDeploymentSetup({ hasAdmin: true, email: {} }, async () => ""),
    ).rejects.toThrow("Access key ID")
  })
})

const DATABASE_URL = process.env.TEST_DATABASE_URL

describe.skipIf(!DATABASE_URL && !process.env.CI)("deployment bootstrap in Postgres", () => {
  let client: pg.Client
  let db: NodePgDatabase
  const schema = `deploy_setup_${randomUUID().replace(/-/g, "")}`
  beforeAll(async () => {
    client = new pg.Client({ connectionString: DATABASE_URL })
    await client.connect()
    await client.query(`create schema ${schema}`)
    await client.query(`create table ${schema}.accounts (like public.accounts including all)`)
    await client.query(`create table ${schema}.site_config (like public.site_config including all)`)
    await client.query(`set search_path to ${schema}, public`)
    db = drizzle(client)
  })
  beforeEach(async () => {
    await client.query(`truncate ${schema}.accounts, ${schema}.site_config`)
  })
  afterAll(async () => {
    if (!client) return
    await client.query(`drop schema if exists ${schema} cascade`)
    await client.end()
  })

  it("creates a usable admin and SES settings, then redeploys without prompts or changes", async () => {
    await setupDeployment(db, ask())
    const { rows: accounts } = await client.query("select * from accounts")
    expect(accounts).toHaveLength(1)
    expect(accounts[0]).toMatchObject({
      email: "admin@example.com",
      is_admin: true,
      deleted: false,
      flagged_as_spammer: false,
    })
    expect(accounts[0].normalized_username).toBe(accounts[0].username.replace(/-/g, ""))
    expect(accounts[0].created_at).toBeInstanceOf(Date)
    const { rows: config } = await client.query("select data from site_config")
    expect(config[0].data.email).toEqual(email)
    const prompt = ask()
    await setupDeployment(db, prompt)
    expect(prompt).not.toHaveBeenCalled()
    expect((await client.query("select * from accounts")).rows).toEqual(accounts)
    expect((await client.query("select data from site_config")).rows).toEqual(config)
  })

  it("promotes an existing mixed-case account and preserves other integrations", async () => {
    await client.query(
      "insert into accounts (name, username, email) values ('Existing', 'existing', 'Admin@Example.com')",
    )
    await client.query("insert into site_config (section, data) values ('integrations', $1)", [
      JSON.stringify({
        openai: { enabled: true, apiKey: "test-openai-key" },
        email: { region: "eu-west-1" },
      }),
    ])
    await setupDeployment(db, ask())
    const { rows } = await client.query("select email, is_admin from accounts")
    expect(rows).toEqual([{ email: "Admin@Example.com", is_admin: true }])
    const { rows: config } = await client.query("select data from site_config")
    expect(config[0].data).toEqual({ openai: { enabled: true, apiKey: "test-openai-key" }, email })
  })

  it("refuses to reactivate a blocked or deleted account", async () => {
    await client.query(
      "insert into accounts (name, username, email, deleted) values ('Deleted', 'deleted', 'admin@example.com', true)",
    )
    await expect(setupDeployment(db, ask())).rejects.toThrow("deleted or blocked account")
    expect((await client.query("select is_admin from accounts")).rows).toEqual([
      { is_admin: false },
    ])
    expect((await client.query("select * from site_config")).rows).toEqual([])
  })

  it("rolls the admin back if saving SES fails, without exposing credentials", async () => {
    await client.query(
      `alter table ${schema}.site_config add constraint refuse_setup check (section <> 'integrations')`,
    )
    try {
      await expect(setupDeployment(db, ask())).rejects.toThrow(
        "Could not prepare the initial admin and SES settings",
      )
      expect((await client.query("select * from accounts")).rows).toEqual([])
      expect((await client.query("select * from site_config")).rows).toEqual([])
    } finally {
      await client.query(`alter table ${schema}.site_config drop constraint refuse_setup`)
    }
  })
})
