import { cn } from "@/lib/utils"

export function Prompt({
  count = " ",
  blank,
  out,
  className,
}: {
  count?: number | string | null
  blank?: boolean
  out?: boolean
  className?: string
}) {
  return (
    <div className={className}>
      <div
        className={cn(
          "box-border block w-20 select-none whitespace-nowrap font-mono text-sm leading-5",
          blank ? "p-0" : out ? "p-1" : "py-2 px-1",
          out ? "text-red-800 dark:text-red-500" : "text-blue-900 dark:text-blue-200",
        )}
      >
        {!blank && (
          <>
            {out ? "Out" : "In "}[{count}]:
          </>
        )}
      </div>
    </div>
  )
}
