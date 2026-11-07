import { useEffect, useRef, type RefObject } from "react"

export function HomeHeroBackground({ heroRef }: { heroRef: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const hero = heroRef.current
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!hero || !canvas || !context) return

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const pointer = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      active: 0,
      targetActive: 0,
    }
    const pulse = { x: 0, y: 0, time: -Infinity }
    let points: ReturnType<typeof createPoint>[] = []
    let width = 0
    let height = 0
    let dotScale = 1
    let time = 0
    let frameId = 0
    let previousFrame = 0
    let visible = false
    let dark = document.documentElement.classList.contains("dark")
    let color = getComputedStyle(canvas).color

    function draw(delta: number) {
      if (!context || !width || !height) return
      context.clearRect(0, 0, width, height)
      context.fillStyle = color

      for (const point of points) {
        const dx = point.x - pointer.x
        const dy = point.y - pointer.y
        const distance = Math.hypot(dx, dy)
        const proximity = Math.exp(-(distance ** 2) / 16000) * pointer.active
        const phase = point.x * 0.012 + point.y * 0.008 - time * 0.72
        const wave = Math.sin(phase)
        let targetX = Math.cos(phase * 0.8 + point.y * 0.003) * 3.1
        let targetY = wave * 5.5 + Math.sin(point.x * 0.005 - point.y * 0.009 + time * 0.44) * 1.3
        targetX += (dx / Math.max(distance, 1)) * proximity * 19
        targetY += (dy / Math.max(distance, 1)) * proximity * 19

        const age = time - pulse.time
        if (age < 2.4) {
          const pulseDistance = Math.hypot(point.x - pulse.x, point.y - pulse.y)
          const ripple =
            Math.exp(-(((pulseDistance - age * 150) / 32) ** 2)) * Math.exp(-age * 1.3) * 9
          targetX += ((point.x - pulse.x) / Math.max(pulseDistance, 1)) * ripple
          targetY += ((point.y - pulse.y) / Math.max(pulseDistance, 1)) * ripple
        }

        if (delta) {
          const friction = Math.exp(-delta * 10)
          point.vx = (point.vx + (targetX - point.dx) * delta * 55) * friction
          point.vy = (point.vy + (targetY - point.dy) * delta * 55) * friction
          point.dx += point.vx * delta
          point.dy += point.vy * delta
        }

        // Keep the text area quieter without making the surrounding dots disappear.
        const quiet =
          1 -
          0.68 *
            Math.exp(
              -((point.x / width - 0.33) ** 2 / 0.075 + (point.y / height - 0.47) ** 2 / 0.09),
            )
        context.globalAlpha =
          0.9 *
          Math.min(
            0.9,
            (0.36 + proximity * 0.28 + wave * 0.025) * (0.4 + 0.6 * quiet) * (dark ? 1.18 : 1),
          )
        context.beginPath()
        context.arc(
          point.x + point.dx,
          point.y + point.dy,
          (1.3 + proximity * 0.4) * dotScale,
          0,
          Math.PI * 2,
        )
        context.fill()
      }
    }

    function frame(now: number) {
      frameId = 0
      if (motion.matches || document.hidden || !visible) return
      if (!previousFrame || now - previousFrame >= 1000 / 30) {
        const delta = previousFrame ? Math.min((now - previousFrame) / 1000, 0.05) : 1 / 30
        previousFrame = now
        time += delta
        const ease = 1 - Math.exp(-delta * 6)
        pointer.x += (pointer.targetX - pointer.x) * ease
        pointer.y += (pointer.targetY - pointer.y) * ease
        pointer.active += (pointer.targetActive - pointer.active) * ease
        draw(delta)
      }
      frameId = requestAnimationFrame(frame)
    }

    function stop() {
      cancelAnimationFrame(frameId)
      frameId = 0
      previousFrame = 0
    }

    function start() {
      if (!frameId && !motion.matches && !document.hidden && visible) {
        frameId = requestAnimationFrame(frame)
      }
    }

    function resize() {
      if (!canvas) return
      const bounds = canvas.getBoundingClientRect()
      if (bounds.width === width && bounds.height === height) return
      width = bounds.width
      height = bounds.height
      dotScale = width < 768 ? 0.75 : 1
      const spacing = 30 * dotScale
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context?.setTransform(ratio, 0, 0, ratio, 0, 0)
      points = []
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) points.push(createPoint(x, y))
      }
      draw(0)
    }

    function locate(event: PointerEvent) {
      if (!canvas) return
      const bounds = canvas.getBoundingClientRect()
      pointer.targetX = event.clientX - bounds.left
      pointer.targetY = event.clientY - bounds.top
      if (pointer.active < 0.01) {
        pointer.x = pointer.targetX
        pointer.y = pointer.targetY
      }
      pointer.targetActive = 1
    }

    function onPointerMove(event: PointerEvent) {
      if (!motion.matches && event.pointerType !== "touch") locate(event)
    }

    function onPointerLeave() {
      pointer.targetActive = 0
    }

    function onPointerDown(event: PointerEvent) {
      if (
        motion.matches ||
        (event.target instanceof Element && event.target.closest("a,button,input,select,textarea"))
      )
        return
      locate(event)
      pulse.x = pointer.targetX
      pulse.y = pointer.targetY
      pulse.time = time
    }

    function onPointerUp(event: PointerEvent) {
      if (event.pointerType === "touch") onPointerLeave()
    }

    function onVisibilityChange() {
      if (document.hidden) {
        pointer.targetActive = 0
        stop()
      } else start()
    }

    function onMotionChange() {
      stop()
      pointer.active = pointer.targetActive = 0
      pulse.time = -Infinity
      draw(0)
      start()
    }

    const themeObserver = new MutationObserver(() => {
      dark = document.documentElement.classList.contains("dark")
      color = getComputedStyle(canvas).color
      draw(0)
    })
    const resizeObserver = new ResizeObserver(resize)
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) start()
      else {
        pointer.targetActive = 0
        stop()
      }
    })

    resize()
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    resizeObserver.observe(canvas)
    intersectionObserver.observe(hero)
    motion.addEventListener("change", onMotionChange)
    document.addEventListener("visibilitychange", onVisibilityChange)
    hero.addEventListener("pointermove", onPointerMove, { passive: true })
    hero.addEventListener("pointerleave", onPointerLeave, { passive: true })
    hero.addEventListener("pointerdown", onPointerDown, { passive: true })
    hero.addEventListener("pointerup", onPointerUp, { passive: true })
    hero.addEventListener("pointercancel", onPointerLeave, { passive: true })

    return () => {
      stop()
      themeObserver.disconnect()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      motion.removeEventListener("change", onMotionChange)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      hero.removeEventListener("pointermove", onPointerMove)
      hero.removeEventListener("pointerleave", onPointerLeave)
      hero.removeEventListener("pointerdown", onPointerDown)
      hero.removeEventListener("pointerup", onPointerUp)
      hero.removeEventListener("pointercancel", onPointerLeave)
    }
  }, [heroRef])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 size-full text-hero-accent"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, rgb(0 0 0 / 28%) 4%, rgb(0 0 0 / 80%) 10%, black 15%, black 85%, rgb(0 0 0 / 80%) 90%, rgb(0 0 0 / 28%) 96%, transparent 100%)",
      }}
    />
  )
}

function createPoint(x: number, y: number) {
  return { x, y, dx: 0, dy: 0, vx: 0, vy: 0 }
}
