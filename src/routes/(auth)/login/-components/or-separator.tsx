export function OrSeparator() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-xs text-muted-foreground">OR</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}
