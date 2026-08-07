import { describe, test, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest"
import { render, screen, act } from "@testing-library/react"
import { useAvailableViewportHeight } from "./useAvailableViewportHeight"

// Mirrors the hook's own constants. Kept local so a change to either shows up
// as a failing expectation rather than a test that silently follows along.
const DEFAULT_BOTTOM_GAP = 52
const GAP = 8
const MIN_HEIGHT = 150

const VIEWPORT_HEIGHT = 900

// Probe mirrors how the storage table views consume the hook: the scroll
// container can mount later than the component, because an empty state renders
// no container at all. That makes the callback ref — not a ref object — the
// thing that starts the measurement. The `.app-page-footer` wrapper is the
// app-owned footer element the hook anchors its bottom edge to.
function Probe({ mounted = true, withFooter = true }: { mounted?: boolean; withFooter?: boolean }) {
  const { ref, height } = useAvailableViewportHeight<HTMLDivElement>()

  return (
    <div>
      <span data-testid="height">{height === undefined ? "unmeasured" : height}</span>
      {mounted && <div data-testid="body" ref={ref} style={{ height: `${height ?? 0}px` }} />}
      {withFooter && <div className="app-page-footer" data-testid="footer" role="contentinfo" />}
    </div>
  )
}

const measuredHeight = () => screen.getByTestId("height").textContent

const setViewportHeight = (height: number) => {
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true, writable: true })
}

// jsdom has no layout engine, so rects are zeroed. A single spy reads from a
// mutable map, so restubbing within a test just swaps the data — it never
// installs a second spy over the first (which Vitest can reject).
let currentRects: Record<string, Partial<DOMRect>> = {}

beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    const id = this.getAttribute("data-testid") ?? ""
    const r = currentRects[id] ?? {}
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      width: 0,
      height: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
      ...r,
    } as DOMRect
  })
})

afterAll(() => {
  vi.restoreAllMocks()
})

// The element top and the footer top are the two numbers the hook reads.
const stubRects = (rects: Record<string, Partial<DOMRect>>) => {
  currentRects = rects
}

const setScrollY = (y: number) =>
  Object.defineProperty(window, "scrollY", { value: y, configurable: true, writable: true })

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
    vi.unstubAllGlobals()
    currentRects = {}
    setViewportHeight(originalInnerHeight)
    setScrollY(0)
  })

  test("measures the gap between the element top and the footer top", () => {
    stubRects({ body: { top: 240 }, footer: { top: 848 } })
    render(<Probe />)

    expect(measuredHeight()).toBe(String(848 - 240 - GAP))
  })

  test("shrinks when the footer is taller (footer top moves up)", () => {
    // A custom footer with more content pushes its top edge up the column; the
    // table gives up exactly that space rather than overlapping the footer.
    stubRects({ body: { top: 240 }, footer: { top: 848 } })
    const { unmount } = render(<Probe />)
    const shortFooter = Number(measuredHeight())
    unmount()

    stubRects({ body: { top: 240 }, footer: { top: 700 } })
    render(<Probe />)

    expect(Number(measuredHeight())).toBe(shortFooter - (848 - 700))
  })

  test("shrinks when the element sits lower on the page", () => {
    // A banner in the page banner slot pushes the element down; it gives up that
    // space instead of growing the document past the footer.
    stubRects({ body: { top: 240 }, footer: { top: 848 } })
    const { unmount } = render(<Probe />)
    const higher = Number(measuredHeight())
    unmount()

    stubRects({ body: { top: 340 }, footer: { top: 848 } })
    render(<Probe />)

    expect(Number(measuredHeight())).toBe(higher - 100)
  })

  test("falls back to the viewport bottom when there is no footer", () => {
    stubRects({ body: { top: 240 } })
    render(<Probe withFooter={false} />)

    expect(measuredHeight()).toBe(String(VIEWPORT_HEIGHT - 240 - DEFAULT_BOTTOM_GAP))
  })

  test("never falls below the minimum height, letting the page scroll instead", () => {
    // The floor takes precedence over fitting the viewport: a container only a
    // couple of rows tall is worse than a page scrollbar.
    stubRects({ body: { top: 240 }, footer: { top: 260 } })
    render(<Probe />)

    expect(measuredHeight()).toBe(String(MIN_HEIGHT))
  })

  test("measures when the element mounts after the first render", () => {
    stubRects({ body: { top: 240 }, footer: { top: 848 } })
    const { rerender } = render(<Probe mounted={false} />)

    expect(measuredHeight()).toBe("unmeasured")

    // The table views render no scroll container while the list is empty or
    // loading. A ref object would have been read once, found null, and never
    // looked at again — leaving the element unsized for the rest of its life.
    rerender(<Probe mounted />)

    expect(measuredHeight()).toBe(String(848 - 240 - GAP))
  })

  test("re-measures when the window is resized", async () => {
    stubRects({ body: { top: 240 }, footer: { top: 848 } })
    render(<Probe />)

    stubRects({ body: { top: 240 }, footer: { top: 600 } })
    await act(async () => {
      window.dispatchEvent(new Event("resize"))
    })
    await flushFrame()

    expect(measuredHeight()).toBe(String(600 - 240 - GAP))
  })

  test("is unaffected by scroll position", () => {
    // getBoundingClientRect is viewport-relative, so both edges shift by the
    // same scrollY when the page is scrolled. Adding scrollY to each keeps the
    // difference — and therefore the height — stable. Without it, a re-measure
    // mid-scroll (e.g. a resize on a scrolled page) would change the height.
    setScrollY(300)
    // Rects are reported relative to the scrolled viewport: both edges are 300
    // higher than in the unscrolled case above.
    stubRects({ body: { top: 240 - 300 }, footer: { top: 848 - 300 } })
    render(<Probe />)

    expect(measuredHeight()).toBe(String(848 - 240 - GAP))
  })

  test("measures without a ResizeObserver", () => {
    // Without this the hook used to bail out entirely, which left every row of
    // every table unrendered under jsdom.
    vi.stubGlobal("ResizeObserver", undefined)
    stubRects({ body: { top: 240 }, footer: { top: 848 } })

    render(<Probe />)

    expect(measuredHeight()).toBe(String(848 - 240 - GAP))
    vi.unstubAllGlobals()
  })

  test("applies the measured height to the element", () => {
    stubRects({ body: { top: 240 }, footer: { top: 848 } })
    render(<Probe />)

    expect(screen.getByTestId("body").style.height).toBe(`${848 - 240 - GAP}px`)
  })
})
