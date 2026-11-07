import { getRouteApi } from "@tanstack/react-router"

import { BlueLink } from "@/components/blue-link"
import { DebouncedSearchInput } from "@/components/debounced-search-input"
import { TablePagination } from "@/components/table-pagination"
import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatRelativeTime } from "@/lib/utils"
import type { ManageAiTutorConversationsPage, ManageAiTutorSearch } from "@/types/ai-tutor"

import { AI_TUTOR_CONVERSATIONS_PER_PAGE } from "../-lib/constants"
import { formatMicrosAsUsd } from "../../../../course/-lib/ai-tutor"

const aiTutorRoute = getRouteApi("/(manage)/manage/ai-tutor/")

export function AiTutorConversations({
  page,
  search,
}: {
  page: ManageAiTutorConversationsPage
  search: ManageAiTutorSearch
}) {
  const navigate = aiTutorRoute.useNavigate()
  const { summary, conversations, totalConversations, courses } = page
  const courseLabels = {
    "0": "All courses",
    ...Object.fromEntries(courses.map((course) => [String(course.id), course.title])),
  }

  function updateSearch(patch: Partial<ManageAiTutorSearch>, replace = false) {
    void navigate({
      search: (prev) => ({ ...prev, page: 1, ...patch }),
      replace,
      resetScroll: false,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Spend, last 24 hours"
          value={formatMicrosAsUsd(summary.costMicros24h)}
        />
        <SummaryCard label="Spend, last 7 days" value={formatMicrosAsUsd(summary.costMicros7d)} />
        <SummaryCard label="Replies, last 7 days" value={summary.replies7d.toLocaleString()} />
        <SummaryCard
          label="Learners, last 7 days"
          value={summary.learners7d.toLocaleString()}
          detail={`in ${summary.conversations7d.toLocaleString()} conversations`}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <DebouncedSearchInput
          value={search.q}
          onChange={(q) => updateSearch({ q }, true)}
          label="Search conversations"
          placeholder="Search learner or title"
          className="sm:w-80"
        />
        <Select
          items={courseLabels}
          value={String(search.course)}
          onValueChange={(value) => updateSearch({ course: Number(value) })}
        >
          <SelectTrigger aria-label="Filter by course" className="h-9! w-full sm:w-72">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(courseLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conversation</TableHead>
              <TableHead>Learner</TableHead>
              <TableHead className="hidden md:table-cell">Course</TableHead>
              <TableHead className="text-right">Messages</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Last active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conversations.length ? (
              conversations.map((conversation) => (
                <TableRow key={conversation.id}>
                  <TableCell className="max-w-72">
                    <div className="flex items-center gap-2">
                      <BlueLink
                        to="/manage/ai-tutor/conversations/$conversationId"
                        params={{ conversationId: String(conversation.id) }}
                        className="truncate font-medium"
                      >
                        {conversation.title ?? "Untitled conversation"}
                      </BlueLink>
                      {conversation.deleted && <Badge variant="outline">Deleted</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <BlueLink
                      to="/manage/users/$userId"
                      params={{ userId: String(conversation.learner.id) }}
                    >
                      {conversation.learner.name}
                    </BlueLink>
                    <div className="text-xs text-muted-foreground">
                      {conversation.learner.email}
                    </div>
                  </TableCell>
                  <TableCell className="hidden max-w-56 truncate md:table-cell">
                    {conversation.course.title}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {conversation.messageCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMicrosAsUsd(conversation.costMicros)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap text-muted-foreground">
                    {/* Server and browser can land on either side of a minute boundary. */}
                    <span suppressHydrationWarning>
                      {formatRelativeTime(conversation.lastMessageAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  {search.q || search.course ? "No conversations match." : "No conversations yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalConversations > AI_TUTOR_CONVERSATIONS_PER_PAGE && (
        <TablePagination
          page={search.page}
          perPage={AI_TUTOR_CONVERSATIONS_PER_PAGE}
          perPageOptions={[AI_TUTOR_CONVERSATIONS_PER_PAGE]}
          totalPages={Math.ceil(totalConversations / AI_TUTOR_CONVERSATIONS_PER_PAGE)}
          totalRows={totalConversations}
          rowLabel="conversations"
          onPageChange={(next) => updateSearch({ page: next })}
          onPerPageChange={() => {}}
        />
      )}
    </div>
  )
}

function SummaryCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl tabular-nums">{value}</CardTitle>
        {detail && <CardDescription className="text-xs">{detail}</CardDescription>}
      </CardHeader>
    </Card>
  )
}
