import { describe, expect, it } from "vite-plus/test"

import type { AiTutorSettings } from "@/types/ai-tutor"

import {
  toAiTutorGeneralSettings,
  toAiTutorModels,
  toAiTutorPlans,
  toManageAiTutorSearch,
} from "./utils"

const models = [
  { id: "gpt-6.1-terra", inputPerMillion: 1, cachedInputPerMillion: 0.05, outputPerMillion: 5 },
  { id: "gpt-6-luna", inputPerMillion: 0.1, cachedInputPerMillion: 0.01, outputPerMillion: 0.5 },
]

const plans: AiTutorSettings["plans"] = {
  free: {
    enabled: true,
    model: "gpt-6-luna",
    reasoningEffort: "low",
    sessionLimitUsd: 0.1,
    weeklyLimitUsd: 0.5,
  },
  pro: {
    enabled: true,
    model: "gpt-6.1-terra",
    reasoningEffort: "medium",
    sessionLimitUsd: 1,
    weeklyLimitUsd: 5,
  },
}

describe("AI tutor settings", () => {
  it("trims the name and prompt, and needs both", () => {
    expect(
      toAiTutorGeneralSettings({ enabled: true, name: "  Ada ", systemPrompt: " Be kind. " }),
    ).toEqual({ settings: { enabled: true, name: "Ada", systemPrompt: "Be kind." } })
    expect(toAiTutorGeneralSettings({ enabled: true, name: " ", systemPrompt: "x" })).toEqual({
      error: "Name cannot be empty.",
    })
  })

  it("only lets a plan use a model with a price, and rounds its limits to cents", () => {
    const result = toAiTutorPlans(
      { ...plans, pro: { ...plans.pro, sessionLimitUsd: 1.234, weeklyLimitUsd: 5.005 } },
      models,
    )
    if ("error" in result) throw new Error(result.error)
    expect(result.settings.pro.sessionLimitUsd).toBe(1.23)
    expect(result.settings.pro.weeklyLimitUsd).toBe(5.01)

    expect(toAiTutorPlans({ ...plans, free: { ...plans.free, model: "gpt-9" } }, models)).toEqual({
      error: "Choose a model for the Free plan.",
    })
  })

  it("rejects negative limits and a week smaller than a session", () => {
    expect(
      toAiTutorPlans({ ...plans, pro: { ...plans.pro, sessionLimitUsd: -1 } }, models),
    ).toEqual({
      error: "The Pro plan's 5-hour limit must be between $0 and $1000.",
    })
    expect(
      toAiTutorPlans({ ...plans, pro: { ...plans.pro, weeklyLimitUsd: 0.5 } }, models),
    ).toEqual({
      error: "The Pro plan's weekly limit can't be lower than its 5-hour limit.",
    })
  })

  it("won't remove a model a plan still uses, or list one twice", () => {
    expect(toAiTutorModels([models[0]], plans)).toEqual({
      error: "The Free plan uses gpt-6-luna. Choose another model for it first.",
    })
    expect(toAiTutorModels([...models, { ...models[0], id: " gpt-6.1-terra " }], plans)).toEqual({
      error: "“gpt-6.1-terra” is listed twice.",
    })
    expect(toAiTutorModels(models, plans)).toEqual({ settings: models })
  })
})

// Search params arrive untyped from the URL, which is what these stand in for.
const parse = (search: Record<string, unknown>) =>
  toManageAiTutorSearch(search as Parameters<typeof toManageAiTutorSearch>[0])

describe("the page's URL", () => {
  it("fills in defaults and drops what it can't read", () => {
    expect(parse({})).toEqual({ tab: "settings", q: "", course: 0, page: 1 })
    expect(parse({ tab: "conversations", q: "priya", course: "1001", page: "3" })).toEqual({
      tab: "conversations",
      q: "priya",
      course: 1001,
      page: 3,
    })
    expect(parse({ tab: "nope", course: "-4", page: "abc" })).toEqual({
      tab: "settings",
      q: "",
      course: 0,
      page: 1,
    })
  })
})
