import { Check, Laptop, Moon, Sun } from "lucide-react"
import type { ComponentProps } from "react"
import { useTheme } from "tanstack-router-theme-provider"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const themeOrder = ["light", "dark", "system"] as const

const THEME_CONFIG = {
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon },
  system: { label: "System", icon: Laptop },
}

export function ModeToggle({ variant = "ghost" }: Pick<ComponentProps<typeof Button>, "variant">) {
  const { theme, setTheme, mounted } = useTheme()

  if (!mounted) {
    return (
      <Button
        variant={variant}
        size="icon-sm"
        className="cursor-pointer text-muted-foreground"
        disabled
      >
        <Sun className="size-5" />
        <span className="sr-only">Toggle color theme</span>
      </Button>
    )
  }

  const current = themeOrder.includes(theme as (typeof themeOrder)[number])
    ? (theme as (typeof themeOrder)[number])
    : "system"
  const Icon = THEME_CONFIG[current].icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant={variant} size="icon-sm" className="cursor-pointer text-muted-foreground">
            <Icon className="size-5" />
            <span className="sr-only">Toggle color theme</span>
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-40">
        {themeOrder.map((value) => {
          const { icon: ItemIcon, label } = THEME_CONFIG[value]
          const isActive = current === value
          return (
            <DropdownMenuItem
              key={value}
              className="gap-2 justify-between"
              onClick={() => setTheme(value)}
            >
              <span className="flex items-center gap-2">
                <ItemIcon className="h-4 w-4" />
                {label}
              </span>
              {isActive ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
