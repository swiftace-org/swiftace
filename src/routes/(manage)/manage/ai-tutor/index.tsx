import { createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { useState } from "react"

import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

import { BrandAssetRow } from "../config/-components/brand-asset-row"
import { AiTutorConversations } from "./-components/ai-tutor-conversations"
import { AiTutorGeneralForm } from "./-components/ai-tutor-general-form"
import { AiTutorModelsForm } from "./-components/ai-tutor-models-form"
import { AiTutorPlansForm } from "./-components/ai-tutor-plans-form"
import { loadManageAiTutorConversations } from "./-functions/load-manage-ai-tutor-conversations"
import { loadManageAiTutorPageData } from "./-functions/load-manage-ai-tutor-page-data"
import {
  DEFAULT_MANAGE_AI_TUTOR_SEARCH,
  MANAGE_AI_TUTOR_TABS,
  type ManageAiTutorTab,
} from "./-lib/constants"
import { toManageAiTutorSearch } from "./-lib/utils"

export const Route = createFileRoute("/(manage)/manage/ai-tutor/")({
  validateSearch: toManageAiTutorSearch,
  search: { middlewares: [stripSearchParams(DEFAULT_MANAGE_AI_TUTOR_SEARCH)] },
  // The conversation filters only matter on their tab, so the settings tabs don't reload on them.
  loaderDeps: ({ search }) =>
    search.tab === "conversations"
      ? { tab: search.tab, q: search.q, course: search.course, page: search.page }
      : { tab: search.tab },
  loader: async ({ deps }) => {
    const [settings, conversations] = await Promise.all([
      loadManageAiTutorPageData(),
      deps.tab === "conversations"
        ? loadManageAiTutorConversations({
            data: { q: deps.q ?? "", course: deps.course ?? 0, page: deps.page ?? 1 },
          })
        : null,
    ])
    return { ...settings, conversations }
  },
  // A search re-runs the loader on each keystroke; this keeps the table up meanwhile.
  pendingMs: 1000,
  pendingComponent: ManageAiTutorPagePending,
  component: ManageAiTutorPage,
})

function ManageAiTutorPage() {
  const {
    settings,
    branding: initialBranding,
    openaiEnabled,
    conversations,
  } = Route.useLoaderData()
  const search = Route.useSearch()
  const { tab } = search
  const navigate = Route.useNavigate()
  const [branding, setBranding] = useState(initialBranding)

  return (
    <main
      className={cn(
        "mx-auto w-full flex-1 space-y-6 px-4 py-8",
        // The conversations table needs the room; the forms read better narrow.
        tab === "conversations" ? "max-w-6xl" : "max-w-3xl",
      )}
    >
      <ManageAiTutorHeader />
      <Tabs
        value={tab}
        onValueChange={(value) =>
          void navigate({
            search: { ...DEFAULT_MANAGE_AI_TUTOR_SEARCH, tab: value as ManageAiTutorTab },
            replace: true,
            resetScroll: false,
          })
        }
      >
        <TabsList variant="line">
          {MANAGE_AI_TUTOR_TABS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="settings" className="flex flex-col gap-6 pt-4">
          <AiTutorGeneralForm
            settings={{
              enabled: settings.enabled,
              name: settings.name,
              systemPrompt: settings.systemPrompt,
            }}
            openaiEnabled={openaiEnabled}
          />
          <Separator />
          <BrandAssetRow asset="aiTutorAvatar" branding={branding} onChange={setBranding} />
        </TabsContent>
        <TabsContent value="plans" className="pt-4">
          <AiTutorPlansForm plans={settings.plans} models={settings.models} />
        </TabsContent>
        <TabsContent value="models" className="pt-4">
          <AiTutorModelsForm models={settings.models} plans={settings.plans} />
        </TabsContent>
        <TabsContent value="conversations" className="pt-4">
          {conversations && <AiTutorConversations page={conversations} search={search} />}
        </TabsContent>
      </Tabs>
    </main>
  )
}

function ManageAiTutorHeader() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Manage AI Tutor</h1>
      <p className="text-sm text-muted-foreground">
        The tutor learners chat with beside each lesson: its name, prompt, models, usage limits and
        conversations.
      </p>
    </div>
  )
}

function ManageAiTutorPagePending() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <ManageAiTutorHeader />
      <div className="flex gap-4 border-b pb-2">
        {MANAGE_AI_TUTOR_TABS.map((option) => (
          <Skeleton key={option.value} className="h-5 w-20" />
        ))}
      </div>
      <div className="space-y-5 pt-4">
        <div className="flex gap-3">
          <Skeleton className="h-5 w-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-9 w-20" />
      </div>
    </main>
  )
}
