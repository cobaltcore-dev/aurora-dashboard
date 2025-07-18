import { render, screen, fireEvent, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
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

  const setup = (currentView: (typeof Views)[keyof typeof Views]) => {
    return render(
      <I18nProvider i18n={i18n}>
        <ViewToggleButtons currentView={currentView} toggleView={mockToggleView} />
      </I18nProvider>
    )
  }

  // Clear mocks before each test
  beforeEach(async () => {
    mockToggleView.mockClear()

    await act(async () => {
      i18n.activate("en")
    })
  })

  it("renders correctly with grid view active", () => {
    setup(Views.GRID)

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
    setup(Views.JSON)

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
    setup(Views.JSON)

    const gridButton = screen.getByTestId("grid-icon").closest("button")
    fireEvent.click(gridButton!)

    expect(mockToggleView).toHaveBeenCalledWith(Views.GRID)
  })

  it("calls toggleView with correct view when json button is clicked", () => {
    setup(Views.GRID)

    const jsonButton = screen.getByTestId("json-icon").closest("button")
    fireEvent.click(jsonButton!)

    expect(mockToggleView).toHaveBeenCalledWith(Views.JSON)
  })

  it("does not call toggleView when disabled grid button is clicked", () => {
    setup(Views.GRID)

    const gridButton = screen.getByTestId("grid-icon").closest("button")
    fireEvent.click(gridButton!)

    expect(mockToggleView).not.toHaveBeenCalled()
  })

  it("does not call toggleView when disabled json button is clicked", () => {
    setup(Views.JSON)

    const jsonButton = screen.getByTestId("json-icon").closest("button")
    fireEvent.click(jsonButton!)

    expect(mockToggleView).not.toHaveBeenCalled()
  })
})
