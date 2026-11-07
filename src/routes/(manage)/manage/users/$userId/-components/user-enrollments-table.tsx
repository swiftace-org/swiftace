import { Link } from "@tanstack/react-router"
import { ExternalLink, Users } from "lucide-react"

import { BlueLink } from "@/components/blue-link"
import { IconButton } from "@/components/icon-button"
import { Badge } from "@/components/ui/badge"
import { ENROLLMENT_GRANTED_BY_SUBSCRIPTION, ENROLLMENT_REVOKED_BY_LAPSE } from "@/lib/config"
import type { ManagedUserEnrollment } from "@/types/user"

import { formatDate } from "../../-lib/utils"
import { SectionProgress } from "../../../../../course/$courseSlug_.manage/participants/-components/section-progress"
import { COURSE_CERTIFICATION_STATUS_REVOKED } from "../../../../../course/$courseSlug_.manage/participants/-lib/constants"
import { UserDetailTable, type UserDetailColumn } from "./user-detail-table"

export function UserEnrollmentsTable({
  enrollments,
  email,
}: {
  enrollments: ManagedUserEnrollment[]
  email: string
}) {
  const columns: UserDetailColumn<ManagedUserEnrollment>[] = [
    {
      id: "course",
      header: "Course",
      cell: ({ row }) => (
        <BlueLink
          to="/course/$courseSlug"
          params={{ courseSlug: row.original.courseSlug }}
          className="font-medium"
        >
          {row.original.courseTitle}
        </BlueLink>
      ),
    },
    {
      id: "enrolledAt",
      header: "Enrolled",
      className: "whitespace-nowrap",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{formatDate(row.original.enrolledAt)}</span>
      ),
    },
    {
      id: "lessons",
      header: "Lessons",
      cell: ({ row }) => (
        <SectionProgress
          completed={row.original.completedLessons}
          total={row.original.totalLessons}
        />
      ),
    },
    {
      id: "assignments",
      header: "Assignments",
      cell: ({ row }) => (
        <SectionProgress
          completed={row.original.completedAssignments}
          total={row.original.totalAssignments}
        />
      ),
    },
    {
      id: "access",
      header: "Access",
      cell: ({ row }) => <EnrollmentAccess paymentStatus={row.original.paymentStatus} />,
    },
    {
      id: "certificate",
      header: "Certificate",
      cell: ({ row }) => {
        if (row.original.certificateSlug) {
          return (
            <BlueLink
              to="/certificate/$certificateSlug"
              params={{ certificateSlug: row.original.certificateSlug }}
              target="_blank"
              className="gap-1"
            >
              View
              <ExternalLink className="size-3.5" />
            </BlueLink>
          )
        }
        return (
          <span className="text-muted-foreground">
            {row.original.certificationStatus === COURSE_CERTIFICATION_STATUS_REVOKED
              ? "Revoked"
              : "—"}
          </span>
        )
      },
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      className: "w-10 text-right",
      cell: ({ row }) => (
        <IconButton
          tooltip="Find in participants"
          render={
            <Link
              to="/course/$courseSlug/manage/participants"
              params={{ courseSlug: row.original.courseSlug }}
              search={{ q: email }}
            />
          }
          nativeButton={false}
        >
          <Users />
        </IconButton>
      ),
    },
  ]

  return (
    <UserDetailTable
      data={enrollments}
      columns={columns}
      getRowId={(enrollment) => enrollment.courseSlug}
      emptyMessage="Not enrolled in any courses."
    />
  )
}

function EnrollmentAccess({ paymentStatus }: { paymentStatus: string | null }) {
  if (paymentStatus === ENROLLMENT_GRANTED_BY_SUBSCRIPTION) {
    return <Badge variant="secondary">Via Pro</Badge>
  }
  if (paymentStatus === ENROLLMENT_REVOKED_BY_LAPSE) {
    return <Badge variant="destructive">Pro lapsed</Badge>
  }
  return <span className="text-muted-foreground">{paymentStatus ?? "Free"}</span>
}
