import { Ansi } from "../ansi"

export function PlainText({ data, className }: { data: string | string[]; className?: string }) {
  return (
    <pre style={{ fontSize: 14, tabSize: 4 }} className="m-0">
      <Ansi className={className}>{typeof data === "string" ? data : data.join("")}</Ansi>
    </pre>
  )
}
