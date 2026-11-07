import type { AiTutorPlan, AiTutorReasoningEffort, ManageAiTutorSearch } from "@/types/ai-tutor"

export type ManageAiTutorTab = ManageAiTutorSearch["tab"]

export const MANAGE_AI_TUTOR_TABS: { value: ManageAiTutorTab; label: string }[] = [
  { value: "settings", label: "Settings" },
  { value: "plans", label: "Plans" },
  { value: "models", label: "Models" },
  { value: "conversations", label: "Conversations" },
]

export const DEFAULT_MANAGE_AI_TUTOR_SEARCH: ManageAiTutorSearch = {
  tab: "settings",
  q: "",
  course: 0,
  page: 1,
}

export const AI_TUTOR_CONVERSATIONS_PER_PAGE = 50

export const AI_TUTOR_PLAN_OPTIONS: { value: AiTutorPlan; label: string; description: string }[] = [
  { value: "free", label: "Free", description: "Signed-in learners without a subscription." },
  { value: "pro", label: "Pro", description: "Monthly and yearly subscribers, and admins." },
]

export const AI_TUTOR_REASONING_EFFORT_OPTIONS: {
  value: AiTutorReasoningEffort
  label: string
}[] = [
  { value: "none", label: "None" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "xhigh", label: "Extra high" },
]

export const AI_TUTOR_REASONING_EFFORT_VALUES = AI_TUTOR_REASONING_EFFORT_OPTIONS.map(
  (option) => option.value,
)

export const AI_TUTOR_NAME_MAX_LENGTH = 40
export const AI_TUTOR_SYSTEM_PROMPT_MAX_LENGTH = 20_000
export const AI_TUTOR_MODEL_ID_MAX_LENGTH = 100
export const AI_TUTOR_MODELS_MAX_COUNT = 20

/** Far above any sensible quota, so a misplaced decimal point is caught before it costs much. */
export const AI_TUTOR_LIMIT_MAX_USD = 1000

/** Per million tokens. OpenAI's dearest model is well under this. */
export const AI_TUTOR_PRICE_MAX_USD = 1000

/** The placeholders `renderAiTutorPrompt` fills in, listed under the prompt. */
export const AI_TUTOR_PROMPT_PLACEHOLDERS = [
  "{{TUTOR_NAME}}",
  "{{SITE_NAME}}",
  "{{COURSE_TITLE}}",
  "{{LEARNER_NAME}}",
]
