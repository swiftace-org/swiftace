/** How far an enrollee has got through the course's required sections. */
export function CourseProgress({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, progress))

  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-40 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {clamped >= 100 ? "Course completed" : `${clamped}% complete`}
      </span>
    </div>
  )
}
