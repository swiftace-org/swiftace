import { describe, expect, it } from "vite-plus/test"

import type { AiTutorPlanSettings } from "@/types/ai-tutor"

import {
  type AiTutorOpenWindow,
  type StoredAiTutorMessage,
  toDisplayMessages,
  toReplayMessages,
  normalizeMathDelimiters,
  renderAiTutorPrompt,
  toAiTutorConversationTitle,
  toAiTutorPlan,
  toAiTutorUsage,
  toCostMicros,
  toWindowsToOpen,
} from "./ai-tutor"

const terra = {
  id: "gpt-6.1-terra",
  inputPerMillion: 1,
  cachedInputPerMillion: 0.05,
  outputPerMillion: 5,
}

const pro: AiTutorPlanSettings = {
  enabled: true,
  model: "gpt-6.1-terra",
  reasoningEffort: "medium",
  sessionLimitUsd: 1,
  weeklyLimitUsd: 5,
}

const now = new Date("2026-11-02T10:00:00Z")
const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000)

function openWindow(kind: string, spentMicros: number, endsAt: Date): AiTutorOpenWindow {
  return { id: kind === "session" ? 1 : 2, kind, startedAt: now, endsAt, spentMicros }
}

describe("AI tutor cost", () => {
  it("prices cached input apart from the rest, and output with its reasoning", () => {
    // 10k input of which 8k cached, 1k output: 2000 × $1 + 8000 × $0.05 + 1000 × $5 per million.
    const usage = {
      inputTokens: 10_000,
      cachedInputTokens: 8000,
      outputTokens: 1000,
      reasoningTokens: 400,
    }
    expect(toCostMicros(usage, terra)).toBe(2000 + 400 + 5000)
  })

  it("never counts more cached tokens than input tokens, and rounds up", () => {
    const usage = { inputTokens: 3, cachedInputTokens: 10, outputTokens: 0, reasoningTokens: 0 }
    expect(toCostMicros(usage, terra)).toBe(1)
  })
})

describe("AI tutor plans", () => {
  it("treats subscribers and admins as Pro", () => {
    expect(toAiTutorPlan(false, false)).toBe("free")
    expect(toAiTutorPlan(true, false)).toBe("pro")
    expect(toAiTutorPlan(false, true)).toBe("pro")
  })
})

describe("AI tutor usage windows", () => {
  it("opens both windows on the first message, timed from it", () => {
    expect(toWindowsToOpen([], now)).toEqual([
      { kind: "session", startedAt: now, endsAt: hoursFromNow(5) },
      { kind: "weekly", startedAt: now, endsAt: hoursFromNow(7 * 24) },
    ])
  })

  it("opens a new 5-hour window once the last has ended, inside the same week", () => {
    const windows = [
      openWindow("session", 500_000, now),
      openWindow("weekly", 500_000, hoursFromNow(20)),
    ]
    expect(toWindowsToOpen(windows, now)).toEqual([
      { kind: "session", startedAt: now, endsAt: hoursFromNow(5) },
    ])
  })

  it("reports each window as a share of the plan's limit, with no block below it", () => {
    const windows = [
      openWindow("session", 620_000, hoursFromNow(2)),
      openWindow("weekly", 1_000_000, hoursFromNow(100)),
    ]
    const usage = toAiTutorUsage({ plan: "pro", settings: pro, unlimited: false, windows, now })
    expect(usage.windows).toEqual([
      { kind: "session", percentUsed: 62, resetsAt: hoursFromNow(2) },
      { kind: "weekly", percentUsed: 20, resetsAt: hoursFromNow(100) },
    ])
    expect(usage.blockedBy).toBeNull()
  })

  it("blocks at the limit until the later of the spent windows resets", () => {
    const windows = [
      openWindow("session", 1_050_000, hoursFromNow(2)),
      openWindow("weekly", 5_000_000, hoursFromNow(100)),
    ]
    const usage = toAiTutorUsage({ plan: "pro", settings: pro, unlimited: false, windows, now })
    expect(usage.blockedBy).toEqual({
      kind: "weekly",
      percentUsed: 100,
      resetsAt: hoursFromNow(100),
    })
  })

  it("ignores a window that has ended, and never blocks an unlimited account", () => {
    const windows = [openWindow("session", 9_000_000, now)]
    const usage = toAiTutorUsage({ plan: "pro", settings: pro, unlimited: false, windows, now })
    expect(usage.windows[0]).toEqual({ kind: "session", percentUsed: 0, resetsAt: null })

    const spent = [openWindow("session", 9_000_000, hoursFromNow(1))]
    expect(
      toAiTutorUsage({ plan: "pro", settings: pro, unlimited: true, windows: spent, now })
        .blockedBy,
    ).toBeNull()
  })

  it("blocks outright when a limit is zero", () => {
    const settings = { ...pro, sessionLimitUsd: 0 }
    const usage = toAiTutorUsage({ plan: "pro", settings, unlimited: false, windows: [], now })
    expect(usage.blockedBy?.kind).toBe("session")
  })
})

describe("AI tutor text", () => {
  it("fills in known placeholders and leaves the rest visible", () => {
    expect(
      renderAiTutorPrompt("Hi {{LEARNER_NAME}}, I'm {{ TUTOR_NAME }} {{NOPE}}", {
        LEARNER_NAME: "Priya",
        TUTOR_NAME: "Ada",
      }),
    ).toBe("Hi Priya, I'm Ada {{NOPE}}")
  })

  it("cleans up a title the model decorated", () => {
    expect(toAiTutorConversationTitle('Title: "Slicing NumPy arrays."\nmore')).toBe(
      "Slicing NumPy arrays",
    )
    expect(toAiTutorConversationTitle("  \n")).toBeNull()
    expect(toAiTutorConversationTitle("x".repeat(100))).toHaveLength(80)
  })

  it("turns LaTeX delimiters into dollars outside code", () => {
    const markdown =
      "Since \\(y = wx + b\\):\n\\[\nL = \\sum_i e_i^2\n\\]\n`\\(code\\)`\n```\n\\[x\\]\n```"
    expect(normalizeMathDelimiters(markdown)).toBe(
      "Since $y = wx + b$:\n$$\nL = \\sum_i e_i^2\n$$\n`\\(code\\)`\n```\n\\[x\\]\n```",
    )
  })
})

describe("AI tutor history", () => {
  const at = new Date("2026-11-02T10:00:00Z")
  const row = (id: number, role: string, parts: unknown[], status: string | null = null) =>
    ({ id, createdAt: at, role, parts, status }) as StoredAiTutorMessage
  const question = row(1, "user", [{ type: "text", content: "What's a view?" }])
  const lookup = [
    {
      type: "tool-call",
      id: "call_1",
      name: "read_course_section",
      arguments: "{}",
      state: "complete",
      output: "…",
    },
    { type: "tool-result", toolCallId: "call_1", content: "…", state: "complete" },
  ]
  const partial = row(2, "assistant", [...lookup, { type: "text", content: "A view is" }], "error")
  const answer = row(
    3,
    "assistant",
    [{ type: "text", content: "A view shares memory." }],
    "complete",
  )

  it("leaves a failed reply out of what the model gets back, so a retry ends on the question", () => {
    expect(toReplayMessages([question, partial]).map((message) => message.role)).toEqual(["user"])
  })

  it("shows a failed reply until it's retried, then only the reply that worked", () => {
    expect(toDisplayMessages([question, partial]).map((message) => message.id)).toEqual([
      "message-1",
      "message-2",
    ])
    expect(toDisplayMessages([question, partial, answer]).map((message) => message.id)).toEqual([
      "message-1",
      "message-3",
    ])
  })

  it("drops reasoning and a tool call a Stop cut off before its result", () => {
    const stopped = row(
      4,
      "assistant",
      [
        { type: "thinking", content: "Hmm" },
        { type: "text", content: "Let me look." },
        {
          type: "tool-call",
          id: "call_2",
          name: "search_course",
          arguments: "{",
          state: "input-streaming",
        },
      ],
      "stopped",
    )
    expect(toReplayMessages([question, stopped])[1].parts).toEqual([
      { type: "text", content: "Let me look." },
    ])
  })
})
