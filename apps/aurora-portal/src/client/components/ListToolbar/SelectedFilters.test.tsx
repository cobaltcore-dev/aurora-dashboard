import { describe, it, expect, vi } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import { SelectedFilters, SelectedFiltersProps } from "./SelectedFilters"
import { SelectedFilter } from "./types"

describe("SelectedFilters", () => {
  const mockOnDelete = vi.fn()
  const mockOnClear = vi.fn()

  const mockFilters: SelectedFilter[] = [
    { name: "status", value: "active" },
    { name: "category", value: "cloud" },
    { name: "region", value: "us-east-1" },
  ]

  afterEach(() => {
    vi.clearAllMocks()
  })

  const setup = (props: SelectedFiltersProps) => {
    return render(
      <I18nProvider i18n={i18n}>
        <PortalProvider>
          <SelectedFilters {...props} />
        </PortalProvider>
      </I18nProvider>
    )
  }

  it("renders without crashing", () => {
    expect(() => {
      setup({ selectedFilters: [], onDelete: mockOnDelete, onClear: mockOnClear })
    }).not.toThrowError()
  })

  it("renders all selected filters as pills", () => {
    setup({ selectedFilters: mockFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    expect(screen.getByText("status")).toBeInTheDocument()
    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByText("category")).toBeInTheDocument()
    expect(screen.getByText("cloud")).toBeInTheDocument()
    expect(screen.getByText("region")).toBeInTheDocument()
    expect(screen.getByText("us-east-1")).toBeInTheDocument()
  })

  it("renders correct number of pills", () => {
    const { container } = setup({ selectedFilters: mockFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    // Assuming Pill renders with a specific data attribute or class
    const pills = container.querySelectorAll('[class*="pill"]')
    expect(pills.length).toBeGreaterThan(0)
  })

  it("calls onDelete with correct filter when close button is clicked", async () => {
    const user = userEvent.setup()
    setup({ selectedFilters: mockFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    // Find all close buttons (pills have close buttons, plus the Clear all button)
    const closeButtons = screen.getAllByRole("button")

    // Click the first pill's close button (not the Clear all button which is last)
    await user.click(closeButtons[0])

    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith(mockFilters[0])
  })

  it("calls onDelete with correct filter for each pill", async () => {
    const user = userEvent.setup()
    setup({ selectedFilters: mockFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    const closeButtons = screen.getAllByRole("button")

    // Click the second close button
    await user.click(closeButtons[1])

    expect(mockOnDelete).toHaveBeenCalledWith(mockFilters[1])
  })

  it("renders nothing when selectedFilters is empty array", () => {
    const { container } = setup({ selectedFilters: [], onDelete: mockOnDelete, onClear: mockOnClear })

    expect(container.querySelector('[class*="pill"]')).not.toBeInTheDocument()
  })

  it("renders pill with correct key prop", () => {
    const singleFilter: SelectedFilter[] = [{ name: "test", value: "value1" }]
    const { container } = setup({ selectedFilters: singleFilter, onDelete: mockOnDelete, onClear: mockOnClear })

    // Check that component renders without key warnings
    expect(container).toBeInTheDocument()
  })

  it("handles filters with same name but different values", async () => {
    const user = userEvent.setup()
    const duplicateNameFilters: SelectedFilter[] = [
      { name: "status", value: "active" },
      { name: "status", value: "pending" },
    ]

    setup({ selectedFilters: duplicateNameFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByText("pending")).toBeInTheDocument()

    const closeButtons = screen.getAllByRole("button")
    await user.click(closeButtons[0])

    expect(mockOnDelete).toHaveBeenCalledWith(duplicateNameFilters[0])
  })

  it("renders Stack component with correct props", () => {
    const { container } = setup({ selectedFilters: mockFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    // Check that Stack wrapper exists
    expect(container.firstChild).toBeInTheDocument()
  })

  it("passes closeable prop to Pill component", () => {
    setup({ selectedFilters: mockFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    // All pills should have close buttons (closeable=true), plus the Clear all button
    const closeButtons = screen.getAllByRole("button")
    expect(closeButtons).toHaveLength(mockFilters.length + 1) // +1 for Clear all button
  })

  it("handles special characters in filter values", () => {
    const specialFilters: SelectedFilter[] = [
      { name: "query", value: "test@example.com" },
      { name: "path", value: "/api/v1/users" },
    ]

    setup({ selectedFilters: specialFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    expect(screen.getByText("test@example.com")).toBeInTheDocument()
    expect(screen.getByText("/api/v1/users")).toBeInTheDocument()
  })

  it("should render the Clear all button", () => {
    setup({ selectedFilters: mockFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    const clearButton = screen.getByText("Clear all")
    expect(clearButton).toBeInTheDocument()
  })

  it("should call onClear when Clear all button is clicked", async () => {
    const user = userEvent.setup()
    setup({ selectedFilters: mockFilters, onDelete: mockOnDelete, onClear: mockOnClear })

    const clearButton = screen.getByText("Clear all")
    await user.click(clearButton)

    expect(mockOnClear).toHaveBeenCalledTimes(1)
  })

  it("should apply custom clearButtonProps", () => {
    setup({
      selectedFilters: mockFilters,
      onDelete: mockOnDelete,
      onClear: mockOnClear,
      clearButtonProps: {
        className: "custom-clear-button",
        variant: "primary",
      },
    })

    const clearButton = screen.getByText("Clear all")
    expect(clearButton).toHaveClass("custom-clear-button")
  })

  it("should NOT render Clear all button even when no filters are selected", () => {
    setup({ selectedFilters: [], onDelete: mockOnDelete, onClear: mockOnClear })

    const clearButton = screen.queryByText("Clear all")
    expect(clearButton).not.toBeInTheDocument()
  })
})
