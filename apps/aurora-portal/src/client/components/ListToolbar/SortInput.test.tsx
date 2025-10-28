import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { PortalProvider } from "@cloudoperators/juno-ui-components"
import SortInput, { SortOption } from "./SortInput"

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <PortalProvider>{children}</PortalProvider>
  </I18nProvider>
)

describe("SortInput", () => {
  const mockOptions: SortOption[] = [
    { value: "name", label: "Name" },
    { value: "vcpus", label: "VCPUs" },
    { value: "ram", label: "RAM" },
    { value: "disk", label: "Root Disk" },
  ]

  const defaultProps = {
    sortBy: "name",
    onSortByChange: vi.fn(),
    sortDirection: "asc" as const,
    onSortDirectionChange: vi.fn(),
    options: mockOptions,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    i18n.activate("en")
  })

  describe("Rendering", () => {
    it("renders the sort select and direction button", () => {
      render(<SortInput {...defaultProps} />, { wrapper: TestWrapper })

      expect(screen.getByTestId("sort-select")).toBeInTheDocument()
      expect(screen.getByTestId("direction-toggle")).toBeInTheDocument()
    })

    it("renders all provided options", () => {
      render(<SortInput {...defaultProps} />, { wrapper: TestWrapper })

      const sortSelect = screen.getByTestId("sort-select")
      fireEvent.click(sortSelect)

      // Options appear in the dropdown menu, use getAllByText since they might appear multiple times
      mockOptions.forEach((option) => {
        const elements = screen.getAllByText(option.label as string)
        expect(elements.length).toBeGreaterThan(0)
      })
    })

    it("displays the current sortBy value", () => {
      render(<SortInput {...defaultProps} sortBy="vcpus" />, { wrapper: TestWrapper })

      // The Select component displays the current value as text in the button
      // It may appear multiple times (in button and dropdown), so use getAllByText
      const vcpusElements = screen.getAllByText("VCPUs")
      expect(vcpusElements.length).toBeGreaterThan(0)
    })

    it("displays the current sort direction", () => {
      const { rerender } = render(<SortInput {...defaultProps} sortDirection="asc" />, { wrapper: TestWrapper })

      // Check that the direction button is rendered (ascending icon)
      let directionButton = screen.getByTestId("direction-toggle")
      expect(directionButton).toBeInTheDocument()
      // The button shows an icon for ascending - check it exists
      expect(directionButton.querySelector('svg[data-icon="sort_short-wide_arrow-up"]')).toBeInTheDocument()

      rerender(
        <TestWrapper>
          <SortInput {...defaultProps} sortDirection="desc" />
        </TestWrapper>
      )

      directionButton = screen.getByTestId("direction-toggle")
      expect(directionButton).toBeInTheDocument()
      // For descending, the icon should change
      expect(directionButton.querySelector("svg")).toBeInTheDocument()
    })

    it("applies custom className when provided", () => {
      const { container } = render(<SortInput {...defaultProps} sortWrapperProps={{ className: "custom-class" }} />, {
        wrapper: TestWrapper,
      })

      const stackElement = container.querySelector(".custom-class")
      expect(stackElement).toBeInTheDocument()
    })
  })

  describe("Sort By Changes", () => {
    it("calls onSortByChange when a new option is selected", async () => {
      render(<SortInput {...defaultProps} />, { wrapper: TestWrapper })

      const sortSelect = screen.getByTestId("sort-select")
      fireEvent.click(sortSelect)

      const vcpusOption = await screen.findByText("VCPUs")
      fireEvent.click(vcpusOption)

      expect(defaultProps.onSortByChange).toHaveBeenCalledWith("vcpus")
    })

    it("calls onSortByChange with correct value for different options", async () => {
      render(<SortInput {...defaultProps} />, { wrapper: TestWrapper })

      const sortSelect = screen.getByTestId("sort-select")

      // Test RAM option
      fireEvent.click(sortSelect)
      const ramOption = await screen.findByText("RAM")
      fireEvent.click(ramOption)
      expect(defaultProps.onSortByChange).toHaveBeenCalledWith("ram")

      vi.clearAllMocks()

      // Test Root Disk option
      fireEvent.click(sortSelect)
      const diskOption = await screen.findByText("Root Disk")
      fireEvent.click(diskOption)
      expect(defaultProps.onSortByChange).toHaveBeenCalledWith("disk")
    })

    it("handles options with special characters", async () => {
      const specialOptions: SortOption[] = [
        { value: "OS-FLV-EXT-DATA:ephemeral", label: "Ephemeral Disk" },
        { value: "rxtx_factor", label: "RX/TX Factor" },
      ]

      render(<SortInput {...defaultProps} options={specialOptions} />, { wrapper: TestWrapper })

      const sortSelect = screen.getByTestId("sort-select")
      fireEvent.click(sortSelect)

      const ephemeralOption = await screen.findByText("Ephemeral Disk")
      fireEvent.click(ephemeralOption)

      expect(defaultProps.onSortByChange).toHaveBeenCalledWith("OS-FLV-EXT-DATA:ephemeral")
    })
  })

  describe("Sort Direction Changes", () => {
    it("calls onSortDirectionChange when direction button is clicked", () => {
      render(<SortInput {...defaultProps} />, { wrapper: TestWrapper })

      const directionButton = screen.getByTestId("direction-toggle")
      fireEvent.click(directionButton)

      expect(defaultProps.onSortDirectionChange).toHaveBeenCalledWith("desc")
    })

    it("calls onSortDirectionChange with asc when currently desc", () => {
      render(<SortInput {...defaultProps} sortDirection="desc" />, { wrapper: TestWrapper })

      const directionButton = screen.getByTestId("direction-toggle")
      fireEvent.click(directionButton)

      expect(defaultProps.onSortDirectionChange).toHaveBeenCalledWith("asc")
    })

    it("displays correct direction button", () => {
      const { rerender } = render(<SortInput {...defaultProps} sortDirection="asc" />, { wrapper: TestWrapper })

      let directionButton = screen.getByTestId("direction-toggle")
      expect(directionButton).toBeInTheDocument()

      rerender(
        <TestWrapper>
          <SortInput {...defaultProps} sortDirection="desc" />
        </TestWrapper>
      )

      directionButton = screen.getByTestId("direction-toggle")
      expect(directionButton).toBeInTheDocument()
    })
  })

  describe("Edge Cases", () => {
    it("handles empty options array", () => {
      render(<SortInput {...defaultProps} options={[]} />, { wrapper: TestWrapper })

      const sortSelect = screen.getByTestId("sort-select")
      expect(sortSelect).toBeInTheDocument()
    })

    it("handles single option", () => {
      const singleOption: SortOption[] = [{ value: "only", label: "Only Option" }]

      render(<SortInput {...defaultProps} options={singleOption} />, { wrapper: TestWrapper })

      const sortSelect = screen.getByTestId("sort-select")
      fireEvent.click(sortSelect)

      expect(screen.getByText("Only Option")).toBeInTheDocument()
    })

    it("handles sortBy value that doesn't exist in options", () => {
      render(<SortInput {...defaultProps} sortBy="nonexistent" options={[]} />, { wrapper: TestWrapper })

      // Component should still render even with non-existent sortBy value
      const sortSelect = screen.getByTestId("sort-select")
      expect(sortSelect).toBeInTheDocument()
    })

    it("renders without className prop", () => {
      const { container } = render(<SortInput {...defaultProps} />, { wrapper: TestWrapper })

      expect(container.querySelector(".flex.flex-row.items-center")).toBeInTheDocument()
    })
  })

  describe("Props Updates", () => {
    it("updates display when sortBy prop changes", () => {
      const { rerender } = render(<SortInput {...defaultProps} sortBy="name" />, { wrapper: TestWrapper })

      // Check that Name is displayed (may appear multiple times)
      const nameElements = screen.getAllByText("Name")
      expect(nameElements.length).toBeGreaterThan(0)

      rerender(
        <TestWrapper>
          <SortInput {...defaultProps} sortBy="vcpus" />
        </TestWrapper>
      )

      // Check that VCPUs is now displayed
      const vcpusElements = screen.getAllByText("VCPUs")
      expect(vcpusElements.length).toBeGreaterThan(0)
    })

    it("updates display when sortDirection prop changes", () => {
      const { rerender } = render(<SortInput {...defaultProps} sortDirection="asc" />, { wrapper: TestWrapper })

      let directionButton = screen.getByTestId("direction-toggle")
      expect(directionButton).toBeInTheDocument()

      rerender(
        <TestWrapper>
          <SortInput {...defaultProps} sortDirection="desc" />
        </TestWrapper>
      )

      directionButton = screen.getByTestId("direction-toggle")
      expect(directionButton).toBeInTheDocument()
    })

    it("updates display when options prop changes", () => {
      const initialOptions: SortOption[] = [
        { value: "name", label: "Name" },
        { value: "size", label: "Size" },
      ]

      const newOptions: SortOption[] = [
        { value: "date", label: "Date" },
        { value: "type", label: "Type" },
      ]

      const { rerender } = render(<SortInput {...defaultProps} options={initialOptions} sortBy="name" />, {
        wrapper: TestWrapper,
      })

      let sortSelect = screen.getByTestId("sort-select")
      fireEvent.click(sortSelect)
      expect(screen.getByText("Size")).toBeInTheDocument()

      rerender(
        <TestWrapper>
          <SortInput {...defaultProps} options={newOptions} sortBy="date" />
        </TestWrapper>
      )

      sortSelect = screen.getByTestId("sort-select")
      fireEvent.click(sortSelect)
      expect(screen.getByText("Type")).toBeInTheDocument()
    })
  })
})
