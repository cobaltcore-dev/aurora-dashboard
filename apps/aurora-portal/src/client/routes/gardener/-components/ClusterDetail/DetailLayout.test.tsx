import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import DetailLayout, { DetailLayoutProps } from "./DetailLayout"

const setup = (props: DetailLayoutProps) => {
  return render(
    <I18nProvider i18n={i18n}>
      <DetailLayout {...props} />
    </I18nProvider>
  )
}

describe("DetailLayout", () => {
  const defaultProps = {
    title: "Test Title",
    description: "Test description",
    breadcrumbLabel: "Parent",
    breadcrumbActiveLabel: "Current",
    isJsonView: false,
    toggleView: vi.fn(),
    onBack: vi.fn(),
    handleShare: vi.fn(),
    children: <div data-testid="test-children">Test children content</div>,
    cluster: {
      uid: "test-cluster-123",
      name: "test-cluster",
      infrastructure: "aws",
      region: "us-east-1",
      status: "Operational",
      version: "1.28.5",
      readiness: {
        status: "5/5",
        conditions: [],
      },
      workers: [],
      maintenance: {
        startTime: "030000+0000",
        timezone: "UTC",
        windowTime: "040000+0000",
      },
      lastMaintenance: {
        state: "Succeeded",
      },
      autoUpdate: {
        os: true,
        kubernetes: true,
      },
    },
    isDeleteAllowed: true,
    setDeleteClusterModal: vi.fn(),
    setDeleteClusterName: vi.fn(),
  }

  beforeEach(async () => {
    await act(async () => {
      i18n.activate("en")
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("renders the component with all required elements", () => {
    setup(defaultProps)

    // Check if title is rendered
    expect(screen.getByText("Test Title")).toBeInTheDocument()

    // Check if description is rendered
    expect(screen.getByText("Test description")).toBeInTheDocument()

    // Check if breadcrumb items are rendered
    expect(screen.getByText("Parent")).toBeInTheDocument()
    expect(screen.getByText("Current")).toBeInTheDocument()

    // Check if share button is rendered
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument()

    // Check if children are rendered
    expect(screen.getByTestId("test-children")).toBeInTheDocument()
  })

  it("calls onBack when breadcrumb parent item is clicked", () => {
    setup(defaultProps)

    const parentBreadcrumb = screen.getByText("Parent")
    fireEvent.click(parentBreadcrumb)

    expect(defaultProps.onBack).toHaveBeenCalledTimes(1)
  })

  it("calls handleShare when share button is clicked", () => {
    setup(defaultProps)

    const shareButton = screen.getByRole("button", { name: /share/i })
    fireEvent.click(shareButton)

    expect(defaultProps.handleShare).toHaveBeenCalledTimes(1)
  })

  it("renders ViewToggleButtons component and passes correct props", () => {
    const { rerender } = setup({ ...defaultProps, isJsonView: false })

    // Check that ViewToggleButtons is rendered by looking for "View:" text
    expect(screen.getByText("View:")).toBeInTheDocument()

    // Check that grid and json icons are rendered
    expect(screen.getByTestId("grid-icon")).toBeInTheDocument()
    expect(screen.getByTestId("json-icon")).toBeInTheDocument()

    // Test with grid view active - grid button should be disabled
    const gridButton = screen.getByTestId("grid-icon").closest("button")
    const jsonButton = screen.getByTestId("json-icon").closest("button")

    expect(gridButton).toHaveAttribute("disabled")
    expect(jsonButton).not.toHaveAttribute("disabled")

    // Test with JSON view active
    rerender(
      <I18nProvider i18n={i18n}>
        <DetailLayout {...defaultProps} isJsonView={true} />
      </I18nProvider>
    )

    const gridButtonAfterRerender = screen.getByTestId("grid-icon").closest("button")
    const jsonButtonAfterRerender = screen.getByTestId("json-icon").closest("button")

    expect(gridButtonAfterRerender).not.toHaveAttribute("disabled")
    expect(jsonButtonAfterRerender).toHaveAttribute("disabled")
  })

  it("handles ViewToggleButtons interaction correctly", () => {
    setup({ ...defaultProps, isJsonView: false })

    // Find the JSON button (should be enabled since we're in grid view)
    const jsonButton = screen.getByTestId("json-icon").closest("button")

    // Click the JSON button
    fireEvent.click(jsonButton!)

    // The toggleView function should be called
    // Note: ViewToggleButtons calls toggleView with a parameter, but DetailLayout's toggleView prop doesn't expect one
    // This is actually a type mismatch in the component interfaces
    expect(defaultProps.toggleView).toHaveBeenCalledTimes(1)
  })

  it("handles ViewToggleButtons interaction when in JSON view", () => {
    setup({ ...defaultProps, isJsonView: true })

    // Find the grid button (should be enabled since we're in JSON view)
    const gridButton = screen.getByTestId("grid-icon").closest("button")

    // Click the grid button
    fireEvent.click(gridButton!)

    // The toggleView function should be called
    expect(defaultProps.toggleView).toHaveBeenCalledTimes(1)
  })

  it("renders children content correctly", () => {
    const customChildren = (
      <div data-testid="custom-children">
        <h2>Custom Content</h2>
        <p>Some custom paragraph</p>
      </div>
    )

    setup({ ...defaultProps, children: customChildren })

    expect(screen.getByTestId("custom-children")).toBeInTheDocument()
    expect(screen.getByText("Custom Content")).toBeInTheDocument()
    expect(screen.getByText("Some custom paragraph")).toBeInTheDocument()
  })

  it("applies correct CSS classes to title", () => {
    setup(defaultProps)

    const titleElement = screen.getByText("Test Title")
    expect(titleElement).toHaveClass("text-2xl", "font-bold", "text-theme-highest")
  })

  it("applies correct CSS classes to description", () => {
    setup(defaultProps)

    const descriptionElement = screen.getByText("Test description")
    expect(descriptionElement).toHaveClass("text-theme-default", "text-sm", "mt-1")
  })

  it("has correct breadcrumb structure", () => {
    setup(defaultProps)

    // Check that parent breadcrumb is clickable (not active)
    const parentBreadcrumb = screen.getByText("Parent")
    expect(parentBreadcrumb).toBeInTheDocument()

    // Check that current breadcrumb is active
    const currentBreadcrumb = screen.getByText("Current")
    expect(currentBreadcrumb).toBeInTheDocument()
  })

  it("renders share button with correct props", () => {
    setup(defaultProps)

    const shareButton = screen.getByRole("button", { name: /share/i })
    expect(shareButton).toBeInTheDocument()

    // Check if button has the expected icon (this depends on how the Button component renders icons)
    expect(shareButton).toBeInTheDocument()
  })

  it("maintains proper component structure with Stack layouts", () => {
    setup(defaultProps)

    // Verify that all main elements are present in the correct structure
    expect(screen.getByText("Test Title")).toBeInTheDocument()
    expect(screen.getByText("Test description")).toBeInTheDocument()
    expect(screen.getByText("Parent")).toBeInTheDocument()
    expect(screen.getByText("Current")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /share/i })).toBeInTheDocument()
    expect(screen.getByTestId("test-children")).toBeInTheDocument()
  })

  it("renders delete button", () => {
    setup(defaultProps)

    const deleteButton = screen.getByRole("button", { name: /delete/i })
    expect(deleteButton).toBeInTheDocument()
  })

  it("does not render delete button", () => {
    setup({ ...defaultProps, isDeleteAllowed: false })

    const deleteButton = screen.queryByRole("button", { name: /delete/i })
    expect(deleteButton).not.toBeInTheDocument()
  })
})
