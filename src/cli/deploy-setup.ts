import { randomUUID } from "node:crypto"

import { sql } from "drizzle-orm"
import type { NodePgDatabase } from "drizzle-orm/node-postgres"

import { ACCOUNT_EMAIL_MAX_LENGTH, DEFAULT_INTEGRATION_SETTINGS } from "@/lib/config"
import type { DeploymentSetupInput, DeploymentSetupState, TerminalPrompt } from "@/types/cli"

import { LOGIN_EMAIL_PATTERN } from "../routes/(auth)/-lib/constants.ts"
import { toIntegrationSettings } from "../routes/(manage)/manage/config/-lib/utils.server.ts"
import { promptInput } from "./prompt.ts"
import { CommandError, fail } from "./shell.ts"

function needsEmailSetup({ email, hasAdmin }: DeploymentSetupState) {
  return (
    (!hasAdmin && email.enabled !== true) ||
    ["region", "accessKeyId", "secretAccessKey", "fromEmail"].some(
      (key) => !email[key as Exclude<keyof typeof email, "enabled">]?.trim(),
    )
  )
}

export async function collectDeploymentSetup(
  state: DeploymentSetupState,
  ask: TerminalPrompt,
): Promise<DeploymentSetupInput> {
  const input: DeploymentSetupInput = {}
  if (!state.hasAdmin) {
    const email = (await ask("Admin email address")).trim().toLowerCase()
    if (email.length > ACCOUNT_EMAIL_MAX_LENGTH || !LOGIN_EMAIL_PATTERN.test(email)) {
      fail(`Enter a valid admin email address of at most ${ACCOUNT_EMAIL_MAX_LENGTH} characters.`)
    }
    input.adminEmail = email
  }
  if (needsEmailSetup(state)) {
    const email = { ...DEFAULT_INTEGRATION_SETTINGS.email, ...state.email, enabled: true }
    if (!state.email.region?.trim()) {
      email.region =
        (
          await ask("SES AWS region", { defaultValue: DEFAULT_INTEGRATION_SETTINGS.email.region })
        ).trim() || DEFAULT_INTEGRATION_SETTINGS.email.region
    }
    if (!state.email.accessKeyId?.trim()) {
      email.accessKeyId = (await ask("SES access key ID", { secret: true })).trim()
    }
    if (!state.email.secretAccessKey?.trim()) {
      email.secretAccessKey = (await ask("SES secret access key", { secret: true })).trim()
    }
    if (!state.email.fromEmail?.trim()) {
      email.fromEmail = (await ask("SES verified sender email address")).trim()
    }
    const result = toIntegrationSettings({ email }, DEFAULT_INTEGRATION_SETTINGS)
    if ("error" in result) fail(result.error)
    input.email = result.settings.email
  }
  return input
}

async function readSetupState(db: Pick<NodePgDatabase, "execute">): Promise<DeploymentSetupState> {
  const { rows: admins } = await db.execute(sql`
    select id from accounts where is_admin = true and deleted is not true
      and flagged_as_spammer is not true limit 1
  `)
  const { rows } = await db.execute<{ data: { email?: DeploymentSetupState["email"] } }>(sql`
    select data from site_config where section = 'integrations'
  `)
  return { hasAdmin: admins.length > 0, email: rows[0]?.data?.email ?? {} }
}

/** Collect outside the transaction so a person taking time to answer doesn't hold database locks. */
export async function setupDeployment(db: NodePgDatabase, ask: TerminalPrompt = promptInput) {
  try {
    const input = await collectDeploymentSetup(await readSetupState(db), ask)
    if (!input.adminEmail && !input.email) return
    await db.transaction(async (tx) => {
      // Concurrent deploys must not create two first admins or overwrite an already completed setup.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext('swiftace-deploy-setup'))`)
      const state = await readSetupState(tx)
      if (!state.hasAdmin && input.adminEmail) {
        const { rows } = await tx.execute<{
          id: string
          deleted: boolean
          flagged_as_spammer: boolean
        }>(sql`
          select id, deleted, flagged_as_spammer from accounts where lower(email) = lower(${input.adminEmail})
        `)
        if (rows.length > 1 || rows[0]?.deleted || rows[0]?.flagged_as_spammer) {
          fail(
            "That admin email belongs to an ambiguous, deleted or blocked account. Use another address.",
          )
        }
        if (rows[0]) {
          await tx.execute(sql`update accounts set is_admin = true where id = ${rows[0].id}`)
        } else {
          const username = `admin-${randomUUID().replace(/-/g, "")}`
          await tx.execute(sql`
            insert into accounts (name, username, normalized_username, email, is_admin)
            values ('Administrator', ${username}, ${username.replace(/-/g, "")}, ${input.adminEmail}, true)
          `)
        }
      }
      if (input.email && needsEmailSetup(state)) {
        const email = {
          ...input.email,
          ...Object.fromEntries(
            Object.entries(state.email).filter(
              ([, value]) => typeof value === "string" && value.trim(),
            ),
          ),
          enabled: true,
        }
        const result = toIntegrationSettings({ email }, DEFAULT_INTEGRATION_SETTINGS)
        if ("error" in result) fail(result.error)
        await tx.execute(sql`
          insert into site_config (section, data) values ('integrations', ${JSON.stringify({ email: result.settings.email })}::jsonb)
          on conflict (section) do update set data = site_config.data || excluded.data
        `)
      }
    })
  } catch (error) {
    if (error instanceof CommandError) throw error
    // A query failure can include SES credentials in its parameters.
    fail(
      "Could not prepare the initial admin and SES settings. Check the deployment database and retry.",
    )
  }
}
