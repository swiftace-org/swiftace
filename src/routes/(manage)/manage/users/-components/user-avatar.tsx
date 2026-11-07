import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

/** Accounts carry no picture, so an admin tells rows apart by their initials. */
export function UserAvatar({ name, size }: { name: string; size?: "default" | "sm" | "lg" }) {
  return (
    <Avatar size={size} className={size === "lg" ? "size-14" : undefined}>
      <AvatarFallback className={size === "lg" ? "text-lg font-medium" : undefined}>
        {getInitials(name) || "?"}
      </AvatarFallback>
    </Avatar>
  )
}
