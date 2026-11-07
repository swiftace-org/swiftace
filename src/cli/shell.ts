// What the binary's commands share (see index.ts).
import { spawn } from "node:child_process"

import packageJson from "../../package.json" with { type: "json" }

/** The release this is: package.json's version. */
export const VERSION = packageJson.version

/** Whether this is the built binary, rather than `bun src/cli/index.ts` in a checkout. */
export const IS_BINARY = typeof Bun !== "undefined" && Bun.isStandaloneExecutable

/** A failure reported with its message alone, like a usage mistake or a failed download. */
export class CommandError extends Error {}

export function fail(message: string): never {
  throw new CommandError(message)
}

/** Runs a program to completion, showing its output only if it fails. */
export async function run(program: string, ...args: string[]): Promise<void> {
  const { code, output } = await new Promise<{ code: number | null; output: string }>(
    (resolve, reject) => {
      let output = ""
      const child = spawn(program, args, { stdio: ["ignore", "pipe", "pipe"] })
      child.stdout.on("data", (chunk: Buffer) => (output += chunk))
      child.stderr.on("data", (chunk: Buffer) => (output += chunk))
      child.on("error", (error) =>
        reject(new CommandError(`Couldn't run ${program}: ${error.message}`)),
      )
      child.on("close", (code) => resolve({ code, output }))
    },
  )
  if (code === 0) return
  const shown = output.trim()
  fail(`${[program, ...args].join(" ")} failed${shown ? `:\n${shown}` : ""}`)
}

/** Asks a yes/no question on the terminal; anything but y or yes is a no. */
export async function confirm(question: string): Promise<boolean> {
  const { createInterface } = await import("node:readline/promises")
  const prompt = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return /^y(es)?$/i.test((await prompt.question(`${question} [y/N] `)).trim())
  } finally {
    prompt.close()
  }
}
