import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import FilterToolbar from "./FilterToolbar"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"

const TestWrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

describe("FilterToolbar", () => {
  const defaultProps = {
    searchTerm: "",
    setSearchTerm: vi.fn(),
    sortBy: "name",
    handleSortByChange: vi.fn(),
    sortDirection: "asc",
    handleSortDirectionChange: vi.fn(),
    setCreateModalOpen: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  it("renders all filter elements", () => {
    render(<FilterToolbar {...defaultProps} />, { wrapper: TestWrapper })

    expect(screen.getByTestId("search-input")).toBeInTheDocument()
    expect(screen.getByTestId("sort-select")).toBeInTheDocument()
    expect(screen.getByTestId("direction-select")).toBeInTheDocument()
  })

  it("shows create button when user can create flavors", () => {
    render(<FilterToolbar {...defaultProps} canCreateFlavor={true} />, { wrapper: TestWrapper })

    expect(screen.getByRole("button", { name: /Create Flavor/i })).toBeInTheDocument()
  })

  it("hides create button when user cannot create flavors", () => {
    render(<FilterToolbar {...defaultProps} canCreateFlavor={false} />, { wrapper: TestWrapper })

    expect(screen.queryByRole("button", { name: /Create Flavor/i })).not.toBeInTheDocument()
  })

  it("debounces search input", async () => {
    render(<FilterToolbar {...defaultProps} />, { wrapper: TestWrapper })

    const searchInput = screen.getByTestId("search-input")
    fireEvent.input(searchInput, { target: { value: "test search" } })

    expect(defaultProps.setSearchTerm).not.toHaveBeenCalled()

    await waitFor(
      () => {
        expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("test search")
      },
      { timeout: 600 }
    )
  })

  it("clears search on clear button click", () => {
    render(<FilterToolbar {...defaultProps} searchTerm="existing" />, { wrapper: TestWrapper })

    const clearButton = screen.getByRole("button", { name: /clear/i })
    fireEvent.click(clearButton)

    expect(defaultProps.setSearchTerm).toHaveBeenCalledWith("")
  })

  it("handles sort changes", async () => {
    render(<FilterToolbar {...defaultProps} />, { wrapper: TestWrapper })

    const sortSelect = screen.getByTestId("sort-select")
    fireEvent.click(sortSelect)

    const vcpusOption = await screen.findByText("VCPUs")
    fireEvent.click(vcpusOption)

    expect(defaultProps.handleSortByChange).toHaveBeenCalledWith("vcpus")
  })

  it("handles sort direction changes", async () => {
    render(<FilterToolbar {...defaultProps} />, { wrapper: TestWrapper })

    const directionSelect = screen.getByTestId("direction-select")
    fireEvent.click(directionSelect)

    const descendingOption = await screen.findByText("Descending")
    fireEvent.click(descendingOption)

    expect(defaultProps.handleSortDirectionChange).toHaveBeenCalledWith("desc")
  })

  it("opens create modal when create button clicked", () => {
    render(<FilterToolbar {...defaultProps} canCreateFlavor={true} />, { wrapper: TestWrapper })

    const createButton = screen.getByRole("button", { name: /Create Flavor/i })
    fireEvent.click(createButton)

    expect(defaultProps.setCreateModalOpen).toHaveBeenCalledWith(true)
  })
})
