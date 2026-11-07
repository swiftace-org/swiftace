// A focusable `role="separator"` is the ARIA pattern for a resizable pane's handle; an `<hr>` can't be one.
// oxlint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/prefer-tag-over-role
import type { KeyboardEvent, PointerEvent } from "react"

import {
  AI_TUTOR_PANEL_DEFAULT_WIDTH,
  AI_TUTOR_PANEL_MAX_WIDTH,
  AI_TUTOR_PANEL_MAX_WINDOW_SHARE,
  AI_TUTOR_PANEL_MIN_WIDTH,
} from "../-lib/constants"

const KEYBOARD_STEP = 32

/**
 * The tutor panel's left edge: drag it, or use the arrow keys, to resize the panel, and
 * double-click it to go back to the default width.
 */
export function AiTutorResizeHandle({
  width,
  onResize,
  onResizingChange,
}: {
  width: number
  onResize: (width: number) => void
  /** The sidebar animates its width, which has to stop while the edge is dragged. */
  onResizingChange: (isResizing: boolean) => void
}) {
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    const handle = event.currentTarget
    handle.setPointerCapture(event.pointerId)
    onResizingChange(true)

    const handleMove = (move: globalThis.PointerEvent) =>
      onResize(clamp(window.innerWidth - move.clientX))
    const handleUp = () => {
      handle.removeEventListener("pointermove", handleMove)
      handle.removeEventListener("pointerup", handleUp)
      handle.removeEventListener("pointercancel", handleUp)
      onResizingChange(false)
    }
    handle.addEventListener("pointermove", handleMove)
    handle.addEventListener("pointerup", handleUp)
    handle.addEventListener("pointercancel", handleUp)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // The panel sits on the right, so moving its edge left widens it.
    if (event.key === "ArrowLeft") onResize(clamp(width + KEYBOARD_STEP))
    else if (event.key === "ArrowRight") onResize(clamp(width - KEYBOARD_STEP))
    else return
    event.preventDefault()
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the tutor panel"
      aria-valuenow={width}
      aria-valuemin={AI_TUTOR_PANEL_MIN_WIDTH}
      aria-valuemax={AI_TUTOR_PANEL_MAX_WIDTH}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
      onDoubleClick={() => onResize(AI_TUTOR_PANEL_DEFAULT_WIDTH)}
      className="group/resize absolute inset-y-0 -left-1.5 z-20 w-3 cursor-col-resize touch-none outline-none"
    >
      <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover/resize:bg-primary/60 group-focus-visible/resize:bg-primary group-active/resize:bg-primary" />
    </div>
  )
}

function clamp(width: number) {
  const max = Math.min(
    AI_TUTOR_PANEL_MAX_WIDTH,
    window.innerWidth * AI_TUTOR_PANEL_MAX_WINDOW_SHARE,
  )
  return Math.round(Math.max(AI_TUTOR_PANEL_MIN_WIDTH, Math.min(max, width)))
}
