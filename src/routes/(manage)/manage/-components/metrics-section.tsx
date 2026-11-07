import { Link } from "@tanstack/react-router"
import { Fragment, useEffect, useState } from "react"

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn, toSubmitErrorMessage } from "@/lib/utils"
import type { Metrics, MetricsPeriod } from "@/types/metrics"

import { loadMetrics } from "../-functions/load-metrics"
import { DEFAULT_METRICS_PERIOD, METRICS, METRICS_PERIOD_OPTIONS } from "../-lib/constants"

/** Site-wide headline numbers, loaded after the page renders so they never hold it up. */
export function MetricsSection() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<MetricsPeriod>(DEFAULT_METRICS_PERIOD)

  useEffect(() => {
    let isCurrent = true
    loadMetrics()
      .then((loaded) => isCurrent && setMetrics(loaded))
      .catch((loadError) => {
        if (isCurrent) setError(toSubmitErrorMessage(loadError, "Couldn't load the metrics."))
      })
    return () => {
      isCurrent = false
    }
  }, [])

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Metrics</h2>
      <ToggleGroup
        variant="outline"
        size="sm"
        value={[period]}
        // A single-choice group still reports an array, and an empty one when the active
        // item is clicked again — which would leave no period selected.
        onValueChange={(value) => value[0] && setPeriod(value[0] as MetricsPeriod)}
        aria-label="Metrics period"
        className="max-w-full overflow-x-auto"
      >
        {METRICS_PERIOD_OPTIONS.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value} className="px-3">
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {METRICS.map((metric) => {
            const card = (
              <Card
                size="sm"
                className={cn(
                  "gap-1",
                  metric.usersRole && "h-full transition-colors hover:bg-muted/50",
                )}
              >
                <CardHeader className="gap-1">
                  <CardDescription className="text-xs">{metric.label}</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {metrics ? (
                      metrics[metric.key][period].toLocaleString("en-US")
                    ) : (
                      <Skeleton className="my-1 h-6 w-16" />
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>
            )

            return metric.usersRole ? (
              <Link
                key={metric.key}
                to="/manage/users"
                search={{ role: metric.usersRole }}
                className="rounded-xl"
              >
                {card}
              </Link>
            ) : (
              <Fragment key={metric.key}>{card}</Fragment>
            )
          })}
        </div>
      )}
    </section>
  )
}
