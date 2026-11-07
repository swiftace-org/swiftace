export function Javascript({ data }: { data: string | string[] }) {
  return (
    <code className="font-mono text-sm text-gray-900 dark:text-gray-100">
      {typeof data === "string" ? data : data.join("")}
    </code>
  )
}
