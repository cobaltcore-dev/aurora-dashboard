import { useCallback, useLayoutEffect, useRef, useState } from "react"

/**
 * Fallback for the space below the element, used only when no page footer is
 * found (see `findBottomBoundary`). Roughly the default shell footer's height.
 */
const DEFAULT_BOTTOM_GAP = 52

/** Cosmetic breathing room between the element and whatever sits below it. */
const GAP = 8

/**
 * The app's own wrapper around the page footer slot (added in the root
 * layout). Deliberately not a component-library class, so the measurement
 * does not break when the shell's internal markup changes.
 */
const FOOTER_SELECTOR = ".app-page-footer"

/**
 * Below this the element is too short to be worth showing — roughly four rows
 * of a table. It deliberately wins over fitting the viewport: see the note on
 * the hook.
 */
const MIN_HEIGHT = 150

/**
 * The bottom of the space the element may occupy, in viewport coordinates.
 *
 * The shell lays out header, content and footer as a flex column, so the page
 * footer's top edge is exactly where the content area ends — and it moves as
 * the footer's height changes, which a fixed offset cannot follow. The footer
 * is a sibling of the content area, not a descendant of the element, so it is
 * found by querying the document for the app's own footer wrapper rather than
 * walking the element's ancestors.
 *
 * `FOOTER_SELECTOR` targets a wrapper the app controls (added around the footer
 * slot in the root layout), not an internal shell class, so it does not depend
 * on the component library's markup.
 *
 * Falls back to the viewport bottom minus a constant when no footer is present
 * (embedded mode, or a layout without a footer slot).
 */
function findBottomBoundary(): number {
  const footer = document.querySelector<HTMLElement>(FOOTER_SELECTOR)
  if (footer) {
    return footer.getBoundingClientRect().top - GAP
  }
  return window.innerHeight - DEFAULT_BOTTOM_GAP
}

/**
 * Measures how much height an element can take without pushing the document
 * past the viewport.
 *
 * Both edges are measured, so nothing above or below the element has to be
 * guessed. The top comes from the element's own position, so a banner in the
 * page banner slot, a wrapped toolbar or a second line of breadcrumbs shrinks
 * the element rather than growing the page. The bottom comes from the page
 * footer (see `findBottomBoundary`), so a custom footer of any height is
 * accounted for too. Either way the element never grows past what is available
 * and produces a second (window) scrollbar.
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
 *
 * One case is not covered, on purpose: when less than `MIN_HEIGHT` is
 * available — a very short window, or so much content above the element that
 * little room is left — the result is clamped and the document does scroll
 * after all. An element a row and a half tall is worse than a page scrollbar,
 * so the floor takes precedence over fitting the viewport.
 */
export function useAvailableViewportHeight<T extends HTMLElement>() {
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
    if (!element) return

    let frame = 0

    const measure = () => {
      // Viewport coordinates for both edges: the element's top and the top of
      // whatever bounds it from below (the page footer, or the viewport). Both
      // move together with scroll, so the difference is scroll-independent.
      const top = element.getBoundingClientRect().top
      const bottom = findBottomBoundary()
      const available = Math.floor(bottom - top)
      // Clamping here can leave the element taller than the space available,
      // which lets the page scroll. That is the intended trade-off — see above.
      const next = Math.max(MIN_HEIGHT, available)
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

    // ResizeObserver is an enhancement, not a requirement: where it is missing
    // (jsdom, older environments) the initial measurement and window resizes
    // still work, and the element must never be left unsized.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure)
    if (observer) {
      observer.observe(document.body)
      // Ancestors too: inside a fixed-height shell the body never changes size,
      // but the container holding the banner does. The element itself is
      // deliberately not observed — its height is ours to set.
      for (let node = element.parentElement; node && node !== document.body; node = node.parentElement) {
        observer.observe(node)
      }
      // The footer bounds the element from below; a change in its height (custom
      // footer content) must trigger a re-measure even though it is not an
      // ancestor of the element.
      const footer = document.querySelector(FOOTER_SELECTOR)
      if (footer) observer.observe(footer)
    }

    window.addEventListener("resize", scheduleMeasure)
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener("resize", scheduleMeasure)
    }
  }, [element])

  return { ref, elementRef, height }
}
