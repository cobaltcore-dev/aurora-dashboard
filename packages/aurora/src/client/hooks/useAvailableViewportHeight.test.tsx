import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { useAvailableViewportHeight } from "./useAvailableViewportHeight"

// Mirrors the hook's own constants. Kept local so a change to either one shows
// up as a failing expectation rather than a test that silently follows along.
const DEFAULT_BOTTOM_GAP = 52
const MIN_HEIGHT = 200

const VIEWPORT_HEIGHT = 900

// Probe mirrors how the storage table views consume the hook: the scroll
// container can mount later than the component, because an empty state renders
// no container at all. That makes the callback ref — not a ref object — the
// thing that starts the measurement.
function Probe({ mounted = true, bottomGap }: { mounted?: boolean; bottomGap?: number }) {
  const { ref, height } = useAvailableViewportHeight<HTMLDivElement>(bottomGap)

  return (
    <>
      <span data-testid="height">{height === undefined ? "unmeasured" : height}</span>
      {mounted && <div data-testid="body" ref={ref} style={{ height: `${height ?? 0}px` }} />}
    </>
  )
}

const measuredHeight = () => screen.getByTestId("height").textContent

const setViewportHeight = (height: number) => {
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true, writable: true })
}

// jsdom has no layout engine, so every rect is zeroed — stub the one number the
// hook actually reads.
const setElementTop = (top: number) =>
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    top,
    bottom: top,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect)

// The observers coalesce measurements into an animation frame, so tests that
// trigger one have to let that frame run.
const flushFrame = () =>
  act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  })

describe("useAvailableViewportHeight", () => {
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    setViewportHeight(VIEWPORT_HEIGHT)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    setViewportHeight(originalInnerHeight)
  })

  test("measures the space left below the element's position in the document", () => {
    setElementTop(240)
    render(<Probe />)

    expect(measuredHeight()).toBe(String(VIEWPORT_HEIGHT - 240 - DEFAULT_BOTTOM_GAP))
  })

  test("shrinks when the element sits lower on the page", () => {
    // Everything above the element — a banner in the page banner slot, wrapped
    // breadcrumbs — pushes it down, and the element gives up that space rather
    // than growing the document past the viewport.
    setElementTop(240)
    const { unmount } = render(<Probe />)
    const withoutBanner = Number(measuredHeight())
    unmount()

    vi.restoreAllMocks()
    setElementTop(340)
    render(<Probe />)

    expect(Number(measuredHeight())).toBe(withoutBanner - 100)
  })

  test("subtracts a custom bottom gap", () => {
    setElementTop(240)
    render(<Probe bottomGap={120} />)

    expect(measuredHeight()).toBe(String(VIEWPORT_HEIGHT - 240 - 120))
  })

  test("clamps to the minimum height, letting the page scroll instead", () => {
    // The floor takes precedence over fitting the viewport: a container a row
    // and a half tall is worse than a page scrollbar.
    setElementTop(VIEWPORT_HEIGHT - 10)
    render(<Probe />)

    expect(measuredHeight()).toBe(String(MIN_HEIGHT))
  })

  test("measures when the element mounts after the first render", () => {
    setElementTop(240)
    const { rerender } = render(<Probe mounted={false} />)

    expect(measuredHeight()).toBe("unmeasured")

    // The table views render no scroll container while the list is empty or
    // loading. A ref object would have been read once, found null, and never
    // looked at again — leaving the element unsized for the rest of its life.
    rerender(<Probe mounted />)

    expect(measuredHeight()).toBe(String(VIEWPORT_HEIGHT - 240 - DEFAULT_BOTTOM_GAP))
  })

  test("re-measures when the window is resized", async () => {
    setElementTop(240)
    render(<Probe />)

    setViewportHeight(700)
    await act(async () => {
      window.dispatchEvent(new Event("resize"))
    })
    await flushFrame()

    expect(measuredHeight()).toBe(String(700 - 240 - DEFAULT_BOTTOM_GAP))
  })

  test("measures without a ResizeObserver", () => {
    // Without this the hook used to bail out entirely, which left every row of
    // every table unrendered under jsdom.
    vi.stubGlobal("ResizeObserver", undefined)
    setElementTop(240)

    render(<Probe />)

    expect(measuredHeight()).toBe(String(VIEWPORT_HEIGHT - 240 - DEFAULT_BOTTOM_GAP))
  })

  test("applies the measured height to the element", () => {
    setElementTop(240)
    render(<Probe />)

    expect(screen.getByTestId("body").style.height).toBe(`${VIEWPORT_HEIGHT - 240 - DEFAULT_BOTTOM_GAP}px`)
  })
})
