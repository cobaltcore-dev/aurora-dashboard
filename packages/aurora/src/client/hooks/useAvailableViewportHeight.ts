import { useCallback, useLayoutEffect, useRef, useState } from "react"

/**
 * Space the page shell keeps below the content area (its bottom padding).
 * A constant of the layout, not of the page: unlike the old
 * `calc(100vh - ... px)` it encodes nothing about what is rendered *above* the
 * element, which is the part that varies (banner slot, breadcrumbs, toolbar).
 */
const DEFAULT_BOTTOM_GAP = 52
const MIN_HEIGHT = 200

/**
 * Measures how much height an element can take without pushing the document
 * past the viewport.
 *
 * The top edge is measured from the element's actual offset in the document,
 * so anything appearing above it — a custom banner in the page banner slot, a
 * wrapped toolbar, a second line of breadcrumbs — shrinks the element instead
 * of growing the page and producing a second (window) scrollbar.
 *
 * Apply the result as `height`, not `max-height`. With `max-height` the
 * element's size follows its content, and for a virtualized list that closes a
 * loop: measured rows change the total size, which changes the scroll
 * container, which makes the virtualizer recompute its range and measure
 * again. A fixed height keeps the container independent of what is inside it.
 *
 * Returns a callback ref rather than taking a ref object, so the measurement
 * also runs when the element mounts later than the component — e.g. after a
 * loading or empty state that renders no scroll container at all.
 */
export function useAvailableViewportHeight<T extends HTMLElement>(bottomGap: number = DEFAULT_BOTTOM_GAP) {
  const elementRef = useRef<T | null>(null)
  const [element, setElement] = useState<T | null>(null)
  const [height, setHeight] = useState<number | undefined>(undefined)

  // Keeps elementRef usable by imperative consumers (virtualizer, measurements)
  // while element state drives the effect below.
  const ref = useCallback((node: T | null) => {
    elementRef.current = node
    setElement(node)
  }, [])

  useLayoutEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") return

    let frame = 0

    const measure = () => {
      // Relative to the document, so the value does not drift while scrolling.
      const topInDocument = element.getBoundingClientRect().top + window.scrollY
      const next = Math.max(MIN_HEIGHT, Math.floor(window.innerHeight - topInDocument - bottomGap))
      // Ignore sub-pixel churn so a re-layout cannot toggle the value forever.
      setHeight((previous) => (previous !== undefined && Math.abs(previous - next) < 1 ? previous : next))
    }

    // Observers can fire for several targets within one frame; one measurement
    // per frame is enough and keeps getBoundingClientRect out of the middle of
    // a layout pass, where it forces a synchronous reflow every time.
    const scheduleMeasure = () => {
      if (frame !== 0) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }

    measure()

    const observer = new ResizeObserver(scheduleMeasure)
    observer.observe(document.body)
    // Ancestors too: inside a fixed-height shell the body never changes size,
    // but the container holding the banner does. The element itself is
    // deliberately not observed — its height is ours to set.
    for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
      observer.observe(node)
    }

    window.addEventListener("resize", scheduleMeasure)
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener("resize", scheduleMeasure)
    }
  }, [element, bottomGap])

  return { ref, elementRef, height }
}
