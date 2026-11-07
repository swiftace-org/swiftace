import { createInterface } from "node:readline/promises"
import { Writable } from "node:stream"

import type { TerminalPromptOptions } from "@/types/cli"

import { fail } from "./shell.ts"

export async function promptInput(question: string, options: TerminalPromptOptions = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    fail("Deploy needs an interactive terminal to collect missing admin and SES settings.")
  }
  return readPrompt(question, options, process.stdin, process.stdout)
}

/** Secret input uses terminal mode to disable local echo and a silent output to hide redisplays. */
export async function readPrompt(
  question: string,
  { secret = false, defaultValue }: TerminalPromptOptions,
  input: NodeJS.ReadableStream,
  output: NodeJS.WritableStream,
): Promise<string> {
  const silent = new Writable({ write: (_chunk, _encoding, done) => done() })
  const terminal = createInterface({ input, output: secret ? silent : output, terminal: true })
  const abort = new AbortController()
  terminal.once("SIGINT", () => abort.abort())
  terminal.once("close", () => abort.abort())
  const suffix = !secret && defaultValue ? ` [${defaultValue}]` : ""
  try {
    const label = `${question}${suffix}${secret ? " (hidden)" : ""}: `
    if (secret) output.write(label)
    return (
      (await terminal.question(secret ? "" : label, { signal: abort.signal })).trim() ||
      defaultValue ||
      ""
    )
  } catch {
    return fail("Deployment setup cancelled.")
  } finally {
    terminal.close()
    silent.destroy()
    if (secret) output.write("\n")
  }
}
