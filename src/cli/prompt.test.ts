import { PassThrough, Writable } from "node:stream"

import { describe, expect, it } from "vite-plus/test"

import { readPrompt } from "./prompt"

function terminal() {
  const input = new PassThrough()
  let written = ""
  const output = new Writable({
    write(chunk, _encoding, done) {
      written += chunk.toString()
      done()
    },
  })
  return { input, output, text: () => written }
}

describe("deployment terminal inputs", () => {
  it("never echoes a secret, even when readline redraws an edited answer", async () => {
    const io = terminal()
    const answer = readPrompt("SES secret access key", { secret: true }, io.input, io.output)
    io.input.write("private-valuex\x7f\r")
    expect(await answer).toBe("private-value")
    expect(io.text()).toBe("SES secret access key (hidden): \n")
    io.input.destroy()
  })

  it("shows and accepts a non-secret default", async () => {
    const io = terminal()
    const answer = readPrompt("SES AWS region", { defaultValue: "us-east-1" }, io.input, io.output)
    io.input.write("\r")
    expect(await answer).toBe("us-east-1")
    expect(io.text()).toContain("SES AWS region [us-east-1]: ")
    io.input.destroy()
  })

  it("cancels cleanly on Ctrl+C without echoing the partially entered secret", async () => {
    const io = terminal()
    const answer = readPrompt("Secret", { secret: true }, io.input, io.output)
    io.input.write("private-value\x03")
    await expect(answer).rejects.toThrow("Deployment setup cancelled.")
    expect(io.text()).not.toContain("private-value")
    io.input.destroy()
  })
})
