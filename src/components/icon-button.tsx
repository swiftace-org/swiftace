import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function IconButton({
  tooltip,
  className,
  variant = "ghost",
  size = "icon-sm",
  "aria-label": ariaLabel,
  ...props
}: { tooltip: string } & ComponentProps<typeof Button>) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant={variant}
            size={size}
            className={cn("cursor-pointer text-muted-foreground", className)}
            aria-label={ariaLabel ?? tooltip}
            {...props}
          />
        }
      />
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
