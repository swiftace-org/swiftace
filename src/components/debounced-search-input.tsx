import { Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { TABLE_SEARCH_DEBOUNCE_MS } from "@/lib/config"
import { cn } from "@/lib/utils"

/**
 * A search box for the admin tables, where the query lives in the URL. The box leads and the URL
 * catches up, and it follows the URL back when that changes elsewhere — back button, shared link.
 */
export function DebouncedSearchInput({
  value,
  onChange,
  label,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  className?: string
}) {
  const [query, setQuery] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)
  if (value !== syncedValue) {
    setSyncedValue(value)
    setQuery(value)
  }

  // Held in a ref so an inline `onChange` from the caller doesn't restart the timer on
  // every render, which would keep the URL from ever catching up.
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  useEffect(() => {
    if (query === value) return
    const timeout = setTimeout(() => onChangeRef.current(query), TABLE_SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [query, value])

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={query}
        aria-label={label}
        placeholder={placeholder}
        className="pl-8"
        onChange={(event) => setQuery(event.target.value)}
      />
    </div>
  )
}
