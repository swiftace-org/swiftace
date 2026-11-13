import type { IntegrationSettings } from "@/types/site-config"

export type TerminalPromptOptions = { secret?: boolean; defaultValue?: string }
export type TerminalPrompt = (question: string, options?: TerminalPromptOptions) => Promise<string>

export type DeploymentSetupState = {
  hasAdmin: boolean
  email: Partial<IntegrationSettings["email"]>
}

export type DeploymentSetupInput = {
  adminEmail?: string
  email?: IntegrationSettings["email"]
}
