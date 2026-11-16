import { describe, expect, it } from "vite-plus/test"

import type { PricingSettings } from "@/types/site-config"
import type { UpdateOverview, UpdateStatus } from "@/types/updates"

import { toHomeSettings, toLegalSettings, toPricingSettings, toUpdateProgress } from "./utils"

const pricing: PricingSettings = {
  planName: "",
  monthlyPlanName: "Pro Monthly",
  yearlyPlanName: "Pro Yearly",
  monthlyTagline: "Monthly billing.",
  yearlyTagline: "Our best price.",
  benefits: ["Every course"],
  freePlanName: "Free",
  freePlanTagline: "Start here.",
  freePlanBenefits: ["Free courses"],
  trialEnabled: true,
  trialDays: 7,
  eyebrow: "Plans",
  headline: "Pick a plan",
  subtitle: "Learn more.",
  faq: [{ question: "Can I cancel?", answer: "Any time." }],
}

describe("home page settings", () => {
  it("keeps one line break per line of the headline and drops blank stat rows", () => {
    const result = toHomeSettings({
      headline: "  Hands-On \n\n  Courses ",
      subtitle: " Learn by doing ",
      stats: [
        { value: "800+", label: "hours of coursework" },
        { value: " ", label: "" },
      ],
    })

    expect(result).toEqual({
      settings: {
        headline: "Hands-On\nCourses",
        subtitle: "Learn by doing",
        stats: [{ value: "800+", label: "hours of coursework" }],
      },
    })
  })

  it("rejects a stat missing its number, and more than three stats", () => {
    const stat = { value: "1", label: "one" }
    const base = { headline: "Courses", subtitle: "Learn" }

    expect(toHomeSettings({ ...base, stats: [{ value: "", label: "learners" }] })).toEqual({
      error: 'Give the "learners" stat a number.',
    })
    expect(toHomeSettings({ ...base, stats: [stat, stat, stat, stat] })).toEqual({
      error: "Add at most 3 stats.",
    })
  })
})

describe("pricing settings", () => {
  it("allows a blank plan name, which means the site name followed by Pro", () => {
    expect(toPricingSettings(pricing)).toEqual({ settings: pricing })
  })

  it("drops blank benefits and questions but needs at least one benefit", () => {
    const result = toPricingSettings({
      ...pricing,
      benefits: ["Every course", "  "],
      faq: [...pricing.faq, { question: " ", answer: "" }],
    })
    expect(result).toEqual({ settings: pricing })

    expect(toPricingSettings({ ...pricing, freePlanBenefits: [" "] })).toEqual({
      error: "List at least one of the free plan benefits.",
    })
  })

  it("takes only a whole number of trial days from 1 to 90", () => {
    for (const trialDays of [0, 2.5, 91, Number.NaN]) {
      expect(toPricingSettings({ ...pricing, trialDays })).toEqual({
        error: "Trial length must be a whole number of days from 1 to 90.",
      })
    }
    expect(toPricingSettings({ ...pricing, trialEnabled: false, trialDays: 30 })).toEqual({
      settings: { ...pricing, trialEnabled: false, trialDays: 30 },
    })
  })

  it("won't save a question without an answer", () => {
    expect(
      toPricingSettings({ ...pricing, faq: [{ question: "Is there a trial?", answer: "" }] }),
    ).toEqual({ error: 'Answer "Is there a trial?", or remove it.' })
  })
})

describe("legal pages", () => {
  it("needs both documents", () => {
    expect(toLegalSettings({ termsOfService: " # Terms ", privacyPolicy: "" })).toEqual({
      error: "Privacy Policy cannot be empty.",
    })
    expect(toLegalSettings({ termsOfService: " # Terms ", privacyPolicy: "# Privacy" })).toEqual({
      settings: { termsOfService: "# Terms", privacyPolicy: "# Privacy" },
    })
  })
})

describe("toUpdateProgress", () => {
  const requestedAt = "2026-11-16T10:00:00.000Z"
  const request = { requestedAt, fromVersion: "0.2.1" }
  const at = (seconds: number) => Date.parse(requestedAt) + seconds * 1000
  const overview = (status: Partial<UpdateStatus> | null, currentVersion = "0.2.1") =>
    ({
      currentVersion,
      latestVersion: "0.3.0",
      canUpdate: true,
      autoUpdate: false,
      status: status && {
        state: "running",
        startedAt: "2026-11-16T10:00:01.000Z",
        fromVersion: "0.2.1",
        ...status,
      },
    }) satisfies UpdateOverview

  it("waits for the updater, then follows it through the restart", () => {
    expect(toUpdateProgress(request, overview(null), at(5)).phase).toBe("waiting")
    // A run from before the request, like the daily timer's, isn't this one.
    const earlier = { state: "upToDate" as const, startedAt: "2026-11-16T09:00:00.000Z" }
    expect(toUpdateProgress(request, overview(earlier), at(5)).phase).toBe("waiting")
    expect(toUpdateProgress(request, overview({}), at(10)).phase).toBe("installing")
    expect(toUpdateProgress(request, undefined, at(30)).phase).toBe("restarting")
  })

  it("is done once the new version answers, whatever the status file says", () => {
    expect(toUpdateProgress(request, overview({}, "0.3.0"), at(40))).toEqual({
      phase: "updated",
      version: "0.3.0",
    })
  })

  it("reports failures, a release that's already installed, and an updater that never starts", () => {
    expect(
      toUpdateProgress(request, overview({ state: "failed", error: "No space" }), at(20)),
    ).toEqual({ phase: "failed", error: "No space" })
    expect(toUpdateProgress(request, overview({ state: "upToDate" }), at(20)).phase).toBe(
      "upToDate",
    )
    expect(toUpdateProgress(request, overview(null), at(61)).phase).toBe("stalled")
    expect(toUpdateProgress(request, undefined, at(21 * 60)).phase).toBe("timedOut")
  })
})
