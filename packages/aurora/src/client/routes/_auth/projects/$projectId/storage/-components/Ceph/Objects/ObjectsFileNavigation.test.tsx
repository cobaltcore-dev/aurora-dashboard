import { describe, it, expect, vi, beforeEach } from "vitest"
import { render as rtlRender, screen } from "@testing-library/react"
import { I18nProvider } from "@lingui/react"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { i18n } from "@lingui/core"
import type { ReactNode, ReactElement } from "react"
import userEvent from "@testing-library/user-event"
import { ObjectsFileNavigation } from "./ObjectsFileNavigation"

const render = (ui: ReactElement) => {
  return rtlRender(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <I18nProvider i18n={i18n}>
        <PortalProvider>{children}</PortalProvider>
      </I18nProvider>
    ),
  })
}

describe("ObjectsFileNavigation", () => {
  beforeEach(() => {
    i18n.activate("en")
  })

  const defaultProps = {
    bucketName: "test-bucket",
    prefix: "",
    onBucketsClick: vi.fn(),
    onPrefixClick: vi.fn(),
  }

  // ── All buckets root crumb ──────────────────────────────────────────────────

  it("renders the All buckets root crumb at root", () => {
    render(<ObjectsFileNavigation {...defaultProps} />)

    expect(screen.getByText("All buckets")).toBeInTheDocument()
  })

  it("renders the All buckets root crumb when nested", () => {
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/reports/" />)

    expect(screen.getByText("All buckets")).toBeInTheDocument()
  })

  it("calls onBucketsClick when All buckets is clicked at root", async () => {
    const onBucketsClick = vi.fn()
    const user = userEvent.setup()
    render(<ObjectsFileNavigation {...defaultProps} onBucketsClick={onBucketsClick} />)

    await user.click(screen.getByText("All buckets"))

    expect(onBucketsClick).toHaveBeenCalledOnce()
  })

  it("calls onBucketsClick when All buckets is clicked from a nested prefix", async () => {
    const onBucketsClick = vi.fn()
    const user = userEvent.setup()
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/reports/2024/" onBucketsClick={onBucketsClick} />)

    await user.click(screen.getByText("All buckets"))

    expect(onBucketsClick).toHaveBeenCalledOnce()
  })

  // ── Bucket crumb ────────────────────────────────────────────────────────────

  it("renders bucket name at root level", () => {
    render(<ObjectsFileNavigation {...defaultProps} />)

    expect(screen.getByText("test-bucket")).toBeInTheDocument()
  })

  it("shows active state at root when prefix is empty", () => {
    const { container } = render(<ObjectsFileNavigation {...defaultProps} />)

    // The bucket crumb should have active class when at root
    const bucketCrumb = container.querySelector(".bg-theme-background-lvl-4")
    expect(bucketCrumb).toBeInTheDocument()
  })

  it("does not make bucket clickable when at root", async () => {
    const onPrefixClick = vi.fn()
    const user = userEvent.setup()
    render(<ObjectsFileNavigation {...defaultProps} onPrefixClick={onPrefixClick} />)

    const bucketElement = screen.getByText("test-bucket")
    await user.click(bucketElement)

    expect(onPrefixClick).not.toHaveBeenCalled()
  })

  it("renders single-level prefix", () => {
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/" />)

    expect(screen.getByText("test-bucket")).toBeInTheDocument()
    expect(screen.getByText("documents")).toBeInTheDocument()
  })

  it("renders multi-level prefix", () => {
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/reports/2024/" />)

    expect(screen.getByText("test-bucket")).toBeInTheDocument()
    expect(screen.getByText("documents")).toBeInTheDocument()
    expect(screen.getByText("reports")).toBeInTheDocument()
    expect(screen.getByText("2024")).toBeInTheDocument()
  })

  it("makes bucket clickable when not at root", async () => {
    const onPrefixClick = vi.fn()
    const user = userEvent.setup()
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/" onPrefixClick={onPrefixClick} />)

    const bucketElement = screen.getByText("test-bucket")
    await user.click(bucketElement)

    expect(onPrefixClick).toHaveBeenCalledWith("")
  })

  it("makes intermediate segments clickable", async () => {
    const onPrefixClick = vi.fn()
    const user = userEvent.setup()
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/reports/2024/" onPrefixClick={onPrefixClick} />)

    const documentsElement = screen.getByText("documents")
    await user.click(documentsElement)

    expect(onPrefixClick).toHaveBeenCalledWith("documents/")
  })

  it("does not make last segment clickable", async () => {
    const onPrefixClick = vi.fn()
    const user = userEvent.setup()
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/reports/" onPrefixClick={onPrefixClick} />)

    const reportsElement = screen.getByText("reports")
    await user.click(reportsElement)

    expect(onPrefixClick).not.toHaveBeenCalled()
  })

  it("navigates to correct prefix for each segment", async () => {
    const onPrefixClick = vi.fn()
    const user = userEvent.setup()
    render(<ObjectsFileNavigation {...defaultProps} prefix="a/b/c/" onPrefixClick={onPrefixClick} />)

    // Click on first segment
    await user.click(screen.getByText("a"))
    expect(onPrefixClick).toHaveBeenCalledWith("a/")

    // Click on second segment
    await user.click(screen.getByText("b"))
    expect(onPrefixClick).toHaveBeenCalledWith("a/b/")

    // Last segment should not be clickable
    await user.click(screen.getByText("c"))
    expect(onPrefixClick).toHaveBeenCalledTimes(2) // Only the first two clicks
  })

  it("handles prefix without trailing slash", () => {
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/reports" />)

    expect(screen.getByText("documents")).toBeInTheDocument()
    expect(screen.getByText("reports")).toBeInTheDocument()
  })

  it("handles deeply nested prefixes", () => {
    render(<ObjectsFileNavigation {...defaultProps} prefix="level1/level2/level3/level4/level5/" />)

    expect(screen.getByText("level1")).toBeInTheDocument()
    expect(screen.getByText("level2")).toBeInTheDocument()
    expect(screen.getByText("level3")).toBeInTheDocument()
    expect(screen.getByText("level4")).toBeInTheDocument()
    expect(screen.getByText("level5")).toBeInTheDocument()
  })

  it("shows correct active state for last segment", () => {
    const { container } = render(<ObjectsFileNavigation {...defaultProps} prefix="documents/reports/" />)

    // Should have two elements with active class (could be multiple if there are multiple active breadcrumbs)
    const activeCrumbs = container.querySelectorAll(".bg-theme-background-lvl-4")
    expect(activeCrumbs.length).toBeGreaterThan(0)
  })

  it("allows navigation back to root from any level", async () => {
    const onPrefixClick = vi.fn()
    const user = userEvent.setup()
    render(<ObjectsFileNavigation {...defaultProps} prefix="documents/reports/2024/" onPrefixClick={onPrefixClick} />)

    const bucketElement = screen.getByText("test-bucket")
    await user.click(bucketElement)

    expect(onPrefixClick).toHaveBeenCalledWith("")
  })
})
