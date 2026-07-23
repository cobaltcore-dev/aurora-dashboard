import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { useVirtualizedTableBody } from "./useVirtualizedTableBody"

// The real virtualizer needs a layout engine jsdom doesn't have, so it reports
// every row — which is what makes the gating observable here: the counts below
// come from the hook withholding that output, not from the virtualizer.
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () => Array.from({ length: count }, (_, i) => ({ index: i, start: i * 48, size: 48, key: i })),
    getTotalSize: () => count * 48,
    measureElement: vi.fn(),
  }),
}))

const VIEWPORT_HEIGHT = 900
const ROW_COUNT = 100

// `mounted: false` stands in for the empty and loading states of the table
// views, which render no scroll container at all.
function Probe({ mounted = true }: { mounted?: boolean }) {
  const { ref, height, virtualItems, totalSize } = useVirtualizedTableBody({ count: ROW_COUNT })

  return (
    <>
      <span data-testid="rendered-rows">{virtualItems.length}</span>
      <span data-testid="total-size">{totalSize}</span>
      {mounted && <div data-testid="body" ref={ref} style={{ height: `${height ?? 0}px` }} />}
    </>
  )
}

const renderedRows = () => screen.getByTestId("rendered-rows").textContent
const totalSize = () => screen.getByTestId("total-size").textContent

describe("useVirtualizedTableBody", () => {
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", { value: VIEWPORT_HEIGHT, configurable: true, writable: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, "innerHeight", { value: originalInnerHeight, configurable: true, writable: true })
  })

  test("renders no rows while the height is unknown", () => {
    // An unsized scroll container measures as tall as its content, so a
    // virtualizer read at this point would size its range to the whole list.
    render(<Probe mounted={false} />)

    expect(renderedRows()).toBe("0")
    expect(totalSize()).toBe("0")
  })

  test("releases the virtualizer output once the container is measured", () => {
    render(<Probe />)

    expect(screen.getByTestId("body").style.height).not.toBe("0px")
    expect(Number(renderedRows())).toBe(ROW_COUNT)
    expect(Number(totalSize())).toBeGreaterThan(0)
  })
})
