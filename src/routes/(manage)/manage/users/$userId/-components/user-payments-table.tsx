import { ExternalLink } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { Badge } from "@/components/ui/badge"
import { ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/config"
import type { ManagedUserPayment } from "@/types/user"

import { formatMinorAmount } from "../-lib/utils"
import { UtcDateTime } from "../../-components/utc-date-time"
import { PAYMENT_STATUS_SUCCEEDED, STRIPE_DASHBOARD_URL } from "../../-lib/constants"
import { formatDate } from "../../-lib/utils"
import { UserDetailTable, type UserDetailColumn } from "./user-detail-table"

const columns: UserDetailColumn<ManagedUserPayment>[] = [
  {
    id: "description",
    header: "Item",
    cell: ({ row }) => (
      <div className="flex flex-col">
        {row.original.courseSlug ? (
          <BlueLink
            to="/course/$courseSlug"
            params={{ courseSlug: row.original.courseSlug }}
            className="font-medium"
          >
            {row.original.description}
          </BlueLink>
        ) : (
          <span className="font-medium">{row.original.description}</span>
        )}
        <span className="text-xs text-muted-foreground">
          {row.original.kind === "course" ? "Course purchase" : "Subscription"}
        </span>
      </div>
    ),
  },
  {
    id: "createdAt",
    header: "Date (UTC)",
    className: "whitespace-nowrap",
    cell: ({ row }) => (
      <UtcDateTime value={row.original.createdAt} className="text-muted-foreground" />
    ),
  },
  {
    id: "amount",
    header: "Amount",
    className: "text-right tabular-nums",
    cell: ({ row }) => formatMinorAmount(row.original.amount, row.original.currency),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <PaymentStatusBadge payment={row.original} />
        {row.original.currentPeriodEnd ? (
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {row.original.cancelAtPeriodEnd ? "Ends" : "Renews"}{" "}
            {formatDate(row.original.currentPeriodEnd)}
          </span>
        ) : null}
      </div>
    ),
  },
  {
    id: "stripe",
    header: "Stripe",
    cell: ({ row }) => (
      <BlueLink
        external
        href={`${STRIPE_DASHBOARD_URL}/${row.original.kind === "course" ? "payments" : "subscriptions"}/${row.original.stripeId}`}
        target="_blank"
        rel="noreferrer"
        className="gap-1 font-mono text-xs"
      >
        {row.original.stripeId.slice(0, 14)}…
        <ExternalLink className="size-3" />
      </BlueLink>
    ),
  },
]

export function UserPaymentsTable({ payments }: { payments: ManagedUserPayment[] }) {
  return (
    <UserDetailTable
      data={payments}
      columns={columns}
      getRowId={(payment) => payment.stripeId}
      emptyMessage="No payments or subscriptions."
    />
  )
}

function PaymentStatusBadge({ payment }: { payment: ManagedUserPayment }) {
  const status = payment.status ?? "unknown"
  const isGood =
    payment.kind === "course"
      ? status === PAYMENT_STATUS_SUCCEEDED
      : ACTIVE_SUBSCRIPTION_STATUSES.includes(status)
  return (
    <Badge variant={isGood ? "default" : "outline"} className="capitalize">
      {status.replaceAll("_", " ")}
    </Badge>
  )
}
