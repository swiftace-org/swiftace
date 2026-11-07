import { BotIcon } from "lucide-react"

import { useSiteConfig } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/** The uploaded avatar, or a robot on the brand color until there is one. */
export function AiTutorAvatar({ className }: { className?: string }) {
  const { aiTutor } = useSiteConfig()
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary",
        className,
      )}
    >
      {aiTutor.avatarUrl ? (
        <img alt="" src={aiTutor.avatarUrl} className="size-full object-cover" />
      ) : (
        <BotIcon className="size-[60%]" />
      )}
    </span>
  )
}
