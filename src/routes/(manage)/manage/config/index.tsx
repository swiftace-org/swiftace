import { createFileRoute } from "@tanstack/react-router"

import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ManageConfigTab } from "@/types/site-config"

import { BrandingSettings } from "./-components/branding-settings"
import { GeneralSettingsForm } from "./-components/general-settings-form"
import { HomeSettingsForm } from "./-components/home-settings-form"
import { IntegrationSettingsForm } from "./-components/integration-settings-form"
import { LegalSettingsForm } from "./-components/legal-settings-form"
import { PricingSettingsForm } from "./-components/pricing-settings-form"
import { loadManageConfigPageData } from "./-functions/load-manage-config-page-data"
import { DEFAULT_MANAGE_CONFIG_TAB, MANAGE_CONFIG_TABS } from "./-lib/constants"

export const Route = createFileRoute("/(manage)/manage/config/")({
  validateSearch: (search: { tab?: string }): { tab?: ManageConfigTab } => ({
    tab: MANAGE_CONFIG_TABS.find((option) => option.value === search.tab)?.value,
  }),
  loader: () => loadManageConfigPageData(),
  pendingComponent: ManageConfigPagePending,
  component: ManageConfigPage,
})

function ManageConfigPage() {
  const { general, branding, home, pricing, legal, integrations, savedSecrets } =
    Route.useLoaderData()
  const { tab = DEFAULT_MANAGE_CONFIG_TAB } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <ManageConfigHeader />
      <Tabs
        value={tab}
        // In the URL, so a link can open straight onto the integrations.
        onValueChange={(value) =>
          void navigate({
            search: { tab: value as ManageConfigTab },
            replace: true,
            resetScroll: false,
          })
        }
      >
        <TabsList
          variant="line"
          className="flex-wrap justify-start group-data-horizontal/tabs:h-auto"
        >
          {MANAGE_CONFIG_TABS.map((option) => (
            <TabsTrigger key={option.value} value={option.value} className="h-8 flex-none">
              {option.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="general" className="pt-4">
          <GeneralSettingsForm settings={general} />
        </TabsContent>
        <TabsContent value="branding" className="pt-4">
          <BrandingSettings settings={branding} />
        </TabsContent>
        <TabsContent value="home" className="pt-4">
          <HomeSettingsForm settings={home} />
        </TabsContent>
        <TabsContent value="pricing" className="pt-4">
          <PricingSettingsForm settings={pricing} />
        </TabsContent>
        <TabsContent value="legal" className="pt-4">
          <LegalSettingsForm settings={legal} />
        </TabsContent>
        <TabsContent value="integrations" className="pt-4">
          <IntegrationSettingsForm settings={integrations} savedSecrets={savedSecrets} />
        </TabsContent>
        <TabsContent value="notebookPreview" className="pt-4">
          <IntegrationSettingsForm
            settings={integrations}
            savedSecrets={savedSecrets}
            integration="notebookPreview"
          />
        </TabsContent>
      </Tabs>
    </main>
  )
}

function ManageConfigHeader() {
  return (
    <div className="space-y-1">
      <h1 className="text-xl font-semibold">Manage Config</h1>
      <p className="text-sm text-muted-foreground">
        This site&apos;s name, contact details, images, page copy and integrations.
      </p>
    </div>
  )
}

function ManageConfigPagePending() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8">
      <ManageConfigHeader />
      <div className="flex flex-wrap gap-4 border-b pb-2">
        {MANAGE_CONFIG_TABS.map((option) => (
          <Skeleton key={option.value} className="h-5 w-20" />
        ))}
      </div>
      <div className="space-y-5 pt-4">
        <div className="grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-9 w-20" />
      </div>
    </main>
  )
}
