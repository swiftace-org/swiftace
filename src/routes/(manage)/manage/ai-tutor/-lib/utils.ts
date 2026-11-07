import type { SearchParamsInput } from "@/lib/utils"
import type {
  AiTutorModel,
  AiTutorPlan,
  AiTutorSettings,
  ManageAiTutorSearch,
} from "@/types/ai-tutor"

import {
  DEFAULT_MANAGE_AI_TUTOR_SEARCH,
  MANAGE_AI_TUTOR_TABS,
  AI_TUTOR_LIMIT_MAX_USD,
  AI_TUTOR_MODEL_ID_MAX_LENGTH,
  AI_TUTOR_MODELS_MAX_COUNT,
  AI_TUTOR_NAME_MAX_LENGTH,
  AI_TUTOR_PLAN_OPTIONS,
  AI_TUTOR_PRICE_MAX_USD,
  AI_TUTOR_REASONING_EFFORT_VALUES,
  AI_TUTOR_SYSTEM_PROMPT_MAX_LENGTH,
} from "./constants"

export type AiTutorGeneralSettings = Pick<AiTutorSettings, "enabled" | "name" | "systemPrompt">

type Result<T> = { settings: T } | { error: string }

export function toAiTutorGeneralSettings(
  values: AiTutorGeneralSettings,
): Result<AiTutorGeneralSettings> {
  const name = values.name.trim()
  const systemPrompt = values.systemPrompt.trim()
  if (!name) return { error: "Name cannot be empty." }
  if (name.length > AI_TUTOR_NAME_MAX_LENGTH) {
    return { error: `Name must be at most ${AI_TUTOR_NAME_MAX_LENGTH} characters.` }
  }
  if (!systemPrompt) return { error: "System prompt cannot be empty." }
  if (systemPrompt.length > AI_TUTOR_SYSTEM_PROMPT_MAX_LENGTH) {
    return {
      error: `System prompt must be at most ${AI_TUTOR_SYSTEM_PROMPT_MAX_LENGTH.toLocaleString()} characters.`,
    }
  }
  return { settings: { enabled: !!values.enabled, name, systemPrompt } }
}

/** Every plan's model has to be one with a price, or its usage couldn't be counted. */
export function toAiTutorPlans(
  values: AiTutorSettings["plans"],
  models: AiTutorModel[],
): Result<AiTutorSettings["plans"]> {
  const plans = {} as AiTutorSettings["plans"]
  for (const { value: plan, label } of AI_TUTOR_PLAN_OPTIONS) {
    const settings = values[plan]
    if (!models.some((model) => model.id === settings.model)) {
      return { error: `Choose a model for the ${label} plan.` }
    }
    if (!AI_TUTOR_REASONING_EFFORT_VALUES.includes(settings.reasoningEffort)) {
      return { error: `Choose a reasoning effort for the ${label} plan.` }
    }
    for (const [limit, window] of [
      [settings.sessionLimitUsd, "5-hour"],
      [settings.weeklyLimitUsd, "weekly"],
    ] as const) {
      if (!Number.isFinite(limit) || limit < 0 || limit > AI_TUTOR_LIMIT_MAX_USD) {
        return {
          error: `The ${label} plan's ${window} limit must be between $0 and $${AI_TUTOR_LIMIT_MAX_USD}.`,
        }
      }
    }
    if (settings.weeklyLimitUsd < settings.sessionLimitUsd) {
      return { error: `The ${label} plan's weekly limit can't be lower than its 5-hour limit.` }
    }
    plans[plan as AiTutorPlan] = {
      enabled: !!settings.enabled,
      model: settings.model,
      reasoningEffort: settings.reasoningEffort,
      sessionLimitUsd: roundToCents(settings.sessionLimitUsd),
      weeklyLimitUsd: roundToCents(settings.weeklyLimitUsd),
    }
  }
  return { settings: plans }
}

/** A model a plan still uses can't be removed, as that plan would have nothing to price it with. */
export function toAiTutorModels(
  values: AiTutorModel[],
  plans: AiTutorSettings["plans"],
): Result<AiTutorModel[]> {
  const models: AiTutorModel[] = []
  for (const value of values) {
    const id = value.id.trim()
    if (!id) return { error: "Every model needs an ID." }
    if (id.length > AI_TUTOR_MODEL_ID_MAX_LENGTH || /\s/.test(id)) {
      return { error: `“${id}” isn't a valid model ID.` }
    }
    if (models.some((model) => model.id === id)) return { error: `“${id}” is listed twice.` }
    for (const price of [
      value.inputPerMillion,
      value.cachedInputPerMillion,
      value.outputPerMillion,
    ]) {
      if (!Number.isFinite(price) || price < 0 || price > AI_TUTOR_PRICE_MAX_USD) {
        return { error: `${id}'s prices must be between $0 and $${AI_TUTOR_PRICE_MAX_USD}.` }
      }
    }
    models.push({
      id,
      inputPerMillion: value.inputPerMillion,
      cachedInputPerMillion: value.cachedInputPerMillion,
      outputPerMillion: value.outputPerMillion,
    })
  }
  if (!models.length) return { error: "Add at least one model." }
  if (models.length > AI_TUTOR_MODELS_MAX_COUNT) {
    return { error: `There can be at most ${AI_TUTOR_MODELS_MAX_COUNT} models.` }
  }
  for (const { value: plan, label } of AI_TUTOR_PLAN_OPTIONS) {
    if (!models.some((model) => model.id === plans[plan].model)) {
      return {
        error: `The ${label} plan uses ${plans[plan].model}. Choose another model for it first.`,
      }
    }
  }
  return { settings: models }
}

function roundToCents(usd: number) {
  return Math.round(usd * 100) / 100
}

/** The page's URL, defaults filled in, so a hand-edited one falls back rather than throwing. */
export function toManageAiTutorSearch(
  search: SearchParamsInput<ManageAiTutorSearch>,
): ManageAiTutorSearch {
  // Not `toFiniteNumber`: `@/lib/utils` reads server env on import, which this file's tests lack.
  const page = Number(search.page)
  const course = Number(search.course)
  return {
    tab:
      MANAGE_AI_TUTOR_TABS.find((option) => option.value === search.tab)?.value ??
      DEFAULT_MANAGE_AI_TUTOR_SEARCH.tab,
    q: typeof search.q === "string" ? search.q : "",
    course: Number.isFinite(course) && course > 0 ? Math.trunc(course) : 0,
    page: Number.isFinite(page) && page > 1 ? Math.trunc(page) : 1,
  }
}
