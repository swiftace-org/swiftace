import { useSiteConfig } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/**
 * The uploaded logo, in its light and dark versions, or the icon and site name until there is
 * one. `iconOnlyBelowSm` shrinks it to the icon on phones, where the navbar has no room for more.
 */
export function SiteLogo({
  size,
  iconOnlyBelowSm = false,
}: {
  size: "sm" | "lg"
  iconOnlyBelowSm?: boolean
}) {
  const { general, branding } = useSiteConfig()
  const height = size === "sm" ? "h-6" : "h-7 sm:h-8"
  const icon = (
    <img
      alt=""
      className={cn(size === "sm" ? "size-6" : "size-7 sm:size-8", "rounded-md")}
      height={32}
      src={branding.iconUrl}
      width={32}
    />
  )

  if (!branding.logoLightUrl) {
    return (
      <span className="flex items-center gap-2">
        {icon}
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            size === "sm" ? "text-base" : "text-lg sm:text-xl",
            iconOnlyBelowSm && "hidden sm:inline",
          )}
        >
          {general.siteName}
        </span>
      </span>
    )
  }

  return (
    <>
      <img
        alt={`${general.siteName} logo`}
        className={cn(
          height,
          "w-auto",
          iconOnlyBelowSm ? "hidden dark:hidden sm:inline" : "dark:hidden",
        )}
        height={32}
        src={branding.logoLightUrl}
      />
      <img
        alt={`${general.siteName} logo`}
        className={cn(height, "hidden w-auto", iconOnlyBelowSm ? "dark:sm:inline" : "dark:block")}
        height={32}
        src={branding.logoDarkUrl}
      />
      {iconOnlyBelowSm && <span className="sm:hidden">{icon}</span>}
    </>
  )
}
