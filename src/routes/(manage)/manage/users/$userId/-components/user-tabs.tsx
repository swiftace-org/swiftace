import { getRouteApi } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ManagedUserOverview, ManagedUserTab } from "@/types/user"

import { MANAGED_USER_TABS } from "../-lib/constants"
import { UserEnrollmentsTable } from "./user-enrollments-table"
import { UserNotebooksTable } from "./user-notebooks-table"
import { UserPaymentsTable } from "./user-payments-table"
import { UserQuizzesTable } from "./user-quizzes-table"
import { UserSubmissionsTable } from "./user-submissions-table"

const userRoute = getRouteApi("/(manage)/manage/users/$userId/")

export function UserTabs({
  overview,
  tab,
}: {
  overview: ManagedUserOverview
  tab: ManagedUserTab
}) {
  const navigate = userRoute.useNavigate()
  const { username, email } = overview.profile

  const counts: Record<ManagedUserTab, number> = {
    enrollments: overview.enrollments.length,
    submissions: overview.submissions.length,
    payments: overview.payments.length,
    quizzes: overview.quizzes.length,
    notebooks: overview.totalNotebooks,
  }

  return (
    <Tabs
      value={tab}
      // The tab lives in the URL so a link can open straight onto someone's payments.
      onValueChange={(value) =>
        void navigate({
          search: { tab: value as ManagedUserTab },
          replace: true,
          resetScroll: false,
        })
      }
      className="min-w-0"
    >
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList variant="line">
          {MANAGED_USER_TABS.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>
              {option.label}
              <Badge variant="secondary" className="tabular-nums">
                {counts[option.value].toLocaleString("en-US")}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value="enrollments">
        <UserEnrollmentsTable enrollments={overview.enrollments} email={email} />
      </TabsContent>
      <TabsContent value="submissions">
        <UserSubmissionsTable submissions={overview.submissions} email={email} />
      </TabsContent>
      <TabsContent value="payments">
        <UserPaymentsTable payments={overview.payments} />
      </TabsContent>
      <TabsContent value="quizzes">
        <UserQuizzesTable quizzes={overview.quizzes} />
      </TabsContent>
      <TabsContent value="notebooks">
        <UserNotebooksTable
          notebooks={overview.notebooks}
          totalNotebooks={overview.totalNotebooks}
          username={username}
        />
      </TabsContent>
    </Tabs>
  )
}
