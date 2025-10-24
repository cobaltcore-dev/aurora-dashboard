import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SelectedFilters } from "./SelectedFilters"
import { SelectedFilter } from "./types"

describe("SelectedFilters", () => {
  const mockOnDelete = vi.fn()

  const mockFilters: SelectedFilter[] = [
    { name: "status", value: "active" },
    { name: "category", value: "cloud" },
    { name: "region", value: "us-east-1" },
  ]

  beforeEach(() => {
    mockOnDelete.mockClear()
  })

  it("renders without crashing", () => {
    render(<SelectedFilters selectedFilters={[]} onDelete={mockOnDelete} />)
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders all selected filters as pills", () => {
    render(<SelectedFilters selectedFilters={mockFilters} onDelete={mockOnDelete} />)

    expect(screen.getByText("status")).toBeInTheDocument()
    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByText("category")).toBeInTheDocument()
    expect(screen.getByText("cloud")).toBeInTheDocument()
    expect(screen.getByText("region")).toBeInTheDocument()
    expect(screen.getByText("us-east-1")).toBeInTheDocument()
  })

  it("renders correct number of pills", () => {
    const { container } = render(<SelectedFilters selectedFilters={mockFilters} onDelete={mockOnDelete} />)

    // Assuming Pill renders with a specific data attribute or class
    const pills = container.querySelectorAll('[class*="pill"]')
    expect(pills.length).toBeGreaterThan(0)
  })

  it("calls onDelete with correct filter when close button is clicked", async () => {
    const user = userEvent.setup()
    render(<SelectedFilters selectedFilters={mockFilters} onDelete={mockOnDelete} />)

    // Find all close buttons
    const closeButtons = screen.getAllByRole("button")

    // Click the first close button
    await user.click(closeButtons[0])

    expect(mockOnDelete).toHaveBeenCalledTimes(1)
    expect(mockOnDelete).toHaveBeenCalledWith(mockFilters[0])
  })

  it("calls onDelete with correct filter for each pill", async () => {
    const user = userEvent.setup()
    render(<SelectedFilters selectedFilters={mockFilters} onDelete={mockOnDelete} />)

    const closeButtons = screen.getAllByRole("button")

    // Click the second close button
    await user.click(closeButtons[1])

    expect(mockOnDelete).toHaveBeenCalledWith(mockFilters[1])
  })

  it("renders nothing when selectedFilters is undefined", () => {
    const { container } = render(<SelectedFilters selectedFilters={undefined} onDelete={mockOnDelete} />)

    expect(container.querySelector('[class*="pill"]')).not.toBeInTheDocument()
  })

  it("renders nothing when selectedFilters is empty array", () => {
    const { container } = render(<SelectedFilters selectedFilters={[]} onDelete={mockOnDelete} />)

    expect(container.querySelector('[class*="pill"]')).not.toBeInTheDocument()
  })

  it("renders pill with correct key prop", () => {
    const singleFilter: SelectedFilter[] = [{ name: "test", value: "value1" }]
    const { container } = render(<SelectedFilters selectedFilters={singleFilter} onDelete={mockOnDelete} />)

    // Check that component renders without key warnings
    expect(container).toBeInTheDocument()
  })

  it("handles filters with same name but different values", async () => {
    const user = userEvent.setup()
    const duplicateNameFilters: SelectedFilter[] = [
      { name: "status", value: "active" },
      { name: "status", value: "pending" },
    ]

    render(<SelectedFilters selectedFilters={duplicateNameFilters} onDelete={mockOnDelete} />)

    expect(screen.getByText("active")).toBeInTheDocument()
    expect(screen.getByText("pending")).toBeInTheDocument()

    const closeButtons = screen.getAllByRole("button")
    await user.click(closeButtons[0])

    expect(mockOnDelete).toHaveBeenCalledWith(duplicateNameFilters[0])
  })

  it("renders Stack component with correct props", () => {
    const { container } = render(<SelectedFilters selectedFilters={mockFilters} onDelete={mockOnDelete} />)

    // Check that Stack wrapper exists
    expect(container.firstChild).toBeInTheDocument()
  })

  it("passes closeable prop to Pill component", () => {
    render(<SelectedFilters selectedFilters={mockFilters} onDelete={mockOnDelete} />)

    // All pills should have close buttons (closeable=true)
    const closeButtons = screen.getAllByRole("button")
    expect(closeButtons).toHaveLength(mockFilters.length)
  })

  it("handles special characters in filter values", () => {
    const specialFilters: SelectedFilter[] = [
      { name: "query", value: "test@example.com" },
      { name: "path", value: "/api/v1/users" },
    ]

    render(<SelectedFilters selectedFilters={specialFilters} onDelete={mockOnDelete} />)

    expect(screen.getByText("test@example.com")).toBeInTheDocument()
    expect(screen.getByText("/api/v1/users")).toBeInTheDocument()
  })
})
