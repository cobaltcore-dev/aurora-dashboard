import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import ViewToggleButtons, { Views } from "./ViewToggleButtons"

// Mock the SVG imports
vi.mock("../../../../assets/grid.svg?react", () => ({
  default: () => <svg data-testid="grid-icon" />,
}))
vi.mock("../../../../assets/json.svg?react", () => ({
  default: () => <svg data-testid="json-icon" />,
}))

describe("ViewToggleButtons", () => {
  const mockToggleView = vi.fn()

  // Clear mocks before each test
  beforeEach(() => {
    mockToggleView.mockClear()
  })

  it("renders correctly with grid view active", () => {
    render(<ViewToggleButtons currentView={Views.GRID} toggleView={mockToggleView} />)

    expect(screen.getByText("View:")).toBeInTheDocument()
    expect(screen.getByTestId("grid-icon")).toBeInTheDocument()
    expect(screen.getByTestId("json-icon")).toBeInTheDocument()

    const gridButton = screen.getByTestId("grid-icon").closest("button")
    const jsonButton = screen.getByTestId("json-icon").closest("button")

    expect(gridButton).toHaveAttribute("disabled")
    expect(jsonButton).not.toHaveAttribute("disabled")
    expect(gridButton).toHaveClass("bg-theme-background-lvl-0")
    expect(jsonButton).not.toHaveClass("bg-theme-background-lvl-0")
  })

  it("renders correctly with json view active", () => {
    render(<ViewToggleButtons currentView={Views.JSON} toggleView={mockToggleView} />)

    expect(screen.getByText("View:")).toBeInTheDocument()
    expect(screen.getByTestId("grid-icon")).toBeInTheDocument()
    expect(screen.getByTestId("json-icon")).toBeInTheDocument()

    const gridButton = screen.getByTestId("grid-icon").closest("button")
    const jsonButton = screen.getByTestId("json-icon").closest("button")

    expect(gridButton).not.toHaveAttribute("disabled")
    expect(jsonButton).toHaveAttribute("disabled")
    expect(gridButton).not.toHaveClass("bg-theme-background-lvl-0")
    expect(jsonButton).toHaveClass("bg-theme-background-lvl-0")
  })

  it("calls toggleView with correct view when grid button is clicked", () => {
    render(<ViewToggleButtons currentView={Views.JSON} toggleView={mockToggleView} />)

    const gridButton = screen.getByTestId("grid-icon").closest("button")
    fireEvent.click(gridButton!)

    expect(mockToggleView).toHaveBeenCalledWith(Views.GRID)
  })

  it("calls toggleView with correct view when json button is clicked", () => {
    render(<ViewToggleButtons currentView={Views.GRID} toggleView={mockToggleView} />)

    const jsonButton = screen.getByTestId("json-icon").closest("button")
    fireEvent.click(jsonButton!)

    expect(mockToggleView).toHaveBeenCalledWith(Views.JSON)
  })

  it("does not call toggleView when disabled grid button is clicked", () => {
    render(<ViewToggleButtons currentView={Views.GRID} toggleView={mockToggleView} />)

    const gridButton = screen.getByTestId("grid-icon").closest("button")
    fireEvent.click(gridButton!)

    expect(mockToggleView).not.toHaveBeenCalled()
  })

  it("does not call toggleView when disabled json button is clicked", () => {
    render(<ViewToggleButtons currentView={Views.JSON} toggleView={mockToggleView} />)

    const jsonButton = screen.getByTestId("json-icon").closest("button")
    fireEvent.click(jsonButton!)

    expect(mockToggleView).not.toHaveBeenCalled()
  })
})
