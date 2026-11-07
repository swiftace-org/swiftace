import { Badge } from "@/components/ui/badge"

export function UserRoleBadges({
  user,
}: {
  user: { isAdmin: boolean; flaggedAsSpammer: boolean }
}) {
  return (
    <>
      {user.isAdmin ? <Badge variant="secondary">Admin</Badge> : null}
      {user.flaggedAsSpammer ? <Badge variant="destructive">Spam</Badge> : null}
    </>
  )
}
