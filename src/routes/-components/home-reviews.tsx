import { Link } from "@tanstack/react-router"
import { ChevronDownIcon } from "lucide-react"
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"

import { Button } from "@/components/ui/button"
import { useSiteConfig } from "@/lib/hooks"
import type { Review } from "@/types/review"

import { ReviewCard } from "./review-card"

/** Two viewport heights of reviews before the fade; "Show More" then reveals the rest at once. */
const COLLAPSED_MAX_HEIGHT = "200svh"

/** Roughly a card's avatar row and padding, in characters of body text, for balancing columns. */
const CARD_OVERHEAD_CHARS = 220

/** The course grid's breakpoints (`md`, `xl`), so the two sections line up. */
const TWO_COLUMN_QUERY = "(min-width: 48rem)"
const THREE_COLUMN_QUERY = "(min-width: 80rem)"

export function HomeReviews({ reviews }: { reviews: Review[] }) {
  const columnCount = useColumnCount()
  const { integrations } = useSiteConfig()
  const columns = useMemo(() => toColumns(reviews, columnCount), [reviews, columnCount])
  const [maxHeight, setMaxHeight] = useState(COLLAPSED_MAX_HEIGHT)
  const [isClipped, setIsClipped] = useState(true)
  const [visibleReviewIds, setVisibleReviewIds] = useState(() => new Set<number>())
  const clipRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const fadeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const clip = clipRef.current
    const content = contentRef.current
    if (!clip || !content) return

    const update = () => {
      const clipped = content.offsetHeight > clip.clientHeight + 1
      setIsClipped(clipped)
      const visibleBottom =
        clip.getBoundingClientRect().bottom - (clipped ? (fadeRef.current?.offsetHeight ?? 0) : 0)
      const visibleIds = new Set<number>()
      for (const card of content.querySelectorAll<HTMLElement>("[data-review-id]")) {
        if (!clipped || card.getBoundingClientRect().bottom <= visibleBottom) {
          visibleIds.add(Number(card.dataset.reviewId))
        }
      }
      setVisibleReviewIds((current) =>
        current.size === visibleIds.size && [...visibleIds].every((id) => current.has(id))
          ? current
          : visibleIds,
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(clip)
    observer.observe(content)
    content.querySelectorAll("[data-review-id]").forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [columns, isClipped])

  // Animates to the content's height, then lifts the cap so a later resize can't clip it again.
  function showAll() {
    setMaxHeight(`${contentRef.current?.offsetHeight ?? 0}px`)
  }

  if (!reviews.length) return null

  return (
    <section
      id="reviews"
      aria-labelledby="reviews-heading"
      className="mx-auto flex w-full max-w-6xl scroll-mt-20 flex-col gap-y-4"
    >
      <h2 id="reviews-heading" className="text-3xl font-bold">
        Reviews
      </h2>
      <div className="relative">
        {/* Clipped cards stay inert until visible, so keyboard focus cannot disappear below the fold. */}
        <div
          ref={clipRef}
          className="overflow-clip transition-[max-height] duration-700 ease-in-out"
          style={{ maxHeight }}
          onTransitionEnd={() => maxHeight !== COLLAPSED_MAX_HEIGHT && setMaxHeight("none")}
        >
          <div ref={contentRef} className="flex items-start gap-6">
            {columns.map((column, index) => (
              // oxlint-disable-next-line react/no-array-index-key -- columns are positional
              <div key={index} className="flex min-w-0 flex-1 flex-col gap-6">
                {column.map((review) => (
                  <div
                    key={review.id}
                    data-review-id={review.id}
                    inert={!visibleReviewIds.has(review.id)}
                  >
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        {isClipped && (
          <div
            ref={fadeRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-linear-to-t from-background via-background/80 to-transparent"
          />
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        {isClipped && (
          <Button variant="outline" size="lg" className="h-11 gap-2 px-5" onClick={showAll}>
            Show More
            <ChevronDownIcon aria-hidden className="size-4" />
          </Button>
        )}
        <Button
          className="h-11 px-5"
          size="lg"
          nativeButton={false}
          render={
            <Link
              to="/login"
              search={{ next: integrations.billing.enabled ? "/pricing" : undefined }}
            />
          }
        >
          Get Started
        </Button>
      </div>
    </section>
  )
}

/** Fills the shortest column next, so the list reads left to right and the columns end evenly. */
function toColumns(reviews: Review[], count: number): Review[][] {
  const columns = Array.from({ length: count }, () => ({ chars: 0, reviews: [] as Review[] }))
  for (const review of reviews) {
    const shortest = columns.reduce((min, column) => (column.chars < min.chars ? column : min))
    shortest.reviews.push(review)
    shortest.chars += CARD_OVERHEAD_CHARS + review.body.length + (review.headline?.length ?? 0)
  }
  return columns.map((column) => column.reviews)
}

/** Three on the server, since most visitors are on desktop and the section starts below the fold. */
function useColumnCount() {
  return useSyncExternalStore(
    subscribeToColumnQueries,
    () =>
      window.matchMedia(THREE_COLUMN_QUERY).matches
        ? 3
        : window.matchMedia(TWO_COLUMN_QUERY).matches
          ? 2
          : 1,
    () => 3,
  )
}

function subscribeToColumnQueries(onChange: () => void) {
  const queries = [TWO_COLUMN_QUERY, THREE_COLUMN_QUERY].map((query) => window.matchMedia(query))
  queries.forEach((query) => query.addEventListener("change", onChange))
  return () => queries.forEach((query) => query.removeEventListener("change", onChange))
}
