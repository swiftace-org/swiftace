// Both packages are CommonJS-only; named imports don't work under Vite's SSR module resolution.
import anser from "anser"
import escapeCarriageReturn from "escape-carriage"

import { cn } from "@/lib/utils"

const ansiToJson: typeof anser.ansiToJson = (...args) => anser.ansiToJson(...args)

function getBgClassName(bg?: string) {
  switch (bg) {
    case "ansi-black":
    case "ansi-bright-black":
      return "bg-black dark:bg-white"
    case "ansi-red":
    case "ansi-bright-red":
      return "bg-red-900 dark:bg-red-200"
    case "ansi-green":
    case "ansi-bright-green":
      return "bg-green-900 dark:bg-green-200"
    case "ansi-yellow":
    case "ansi-bright-yellow":
      return "bg-yellow-600 dark:bg-yellow-300"
    case "ansi-blue":
    case "ansi-bright-blue":
      return "bg-blue-600 dark:bg-blue-300"
    case "ansi-magenta":
    case "ansi-bright-magenta":
      return "bg-red-500 dark:bg-red-400"
    case "ansi-cyan":
    case "ansi-bright-cyan":
      return "bg-green-600 dark:bg-green-300"
    case "ansi-white":
    case "ansi-bright-white":
      return "bg-white dark:bg-black"
    default:
      return ""
  }
}

function getColorClassName(fg?: string) {
  switch (fg) {
    case "ansi-black":
    case "ansi-bright-black":
      return "text-black dark:text-white"
    case "ansi-red":
    case "ansi-bright-red":
      return "text-red-600 dark:text-red-300"
    case "ansi-green":
    case "ansi-bright-green":
      return "text-green-600 dark:text-green-300"
    case "ansi-yellow":
    case "ansi-bright-yellow":
      return "text-yellow-600 dark:text-yellow-300"
    case "ansi-blue":
    case "ansi-bright-blue":
      return "text-blue-600 dark:text-blue-300"
    case "ansi-magenta":
    case "ansi-bright-magenta":
      return "text-red-500 dark:text-red-400"
    case "ansi-cyan":
    case "ansi-bright-cyan":
      return "text-green-600 dark:text-green-300"
    case "ansi-white":
    case "ansi-bright-white":
      return "text-white dark:text-black"
    default:
      return ""
  }
}

function ansiToBundles(input: string) {
  return ansiToJson(escapeCarriageReturn(input), {
    json: true,
    remove_empty: true,
    use_classes: true,
  })
}

export function Ansi({
  children,
  className,
  style,
}: {
  children: string
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <code
      className={cn(className, "text-sm text-gray-900 dark:text-gray-100")}
      style={{ ...style, fontSize: 14 }}
    >
      {ansiToBundles(children).map((bundle, i) => (
        <span
          key={i}
          className={cn(
            "whitespace-pre-wrap",
            getBgClassName(bundle.bg),
            getColorClassName(bundle.fg),
          )}
        >
          {bundle.content}
        </span>
      ))}
    </code>
  )
}
