import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import Section from "./Section"

describe("Section Component", () => {
  it("renders without crashing", () => {
    render(<Section title="Test Title" rows={[]} />)
    expect(screen.getByText("Test Title")).toBeInTheDocument()
  })

  it("renders string title as h3 with correct classes", () => {
    render(<Section title="Test Title" rows={[]} />)
    const titleElement = screen.getByText("Test Title")
    expect(titleElement.tagName).toBe("H3")
    expect(titleElement).toHaveClass("text-xl", "font-semibold", "leading-none", "tracking-tight", "text-theme-highest")
  })

  it("renders custom title component when provided", () => {
    const CustomTitle = <span data-testid="custom-title">Custom Title</span>
    render(<Section title={CustomTitle} rows={[]} />)
    expect(screen.getByTestId("custom-title")).toBeInTheDocument()
    expect(screen.queryByText("Custom Title")).toBeInTheDocument()
  })

  it("renders rows correctly", () => {
    const rows = [
      <div key="1" data-testid="row-1">
        Row 1
      </div>,
      <div key="2" data-testid="row-2">
        Row 2
      </div>,
    ]
    render(<Section title="Test Title" rows={rows} />)
    expect(screen.getByTestId("row-1")).toBeInTheDocument()
    expect(screen.getByTestId("row-2")).toBeInTheDocument()
  })

  it("applies custom className to Stack component", () => {
    render(<Section title="Test Title" rows={[]} className="custom-class" />)
    const stackElement = screen.getByText("Test Title").parentElement
    expect(stackElement).toHaveClass("custom-class")
  })

  it("renders DataGrid with correct column styling", () => {
    render(<Section title="Test Title" rows={[]} />)
    const dataGrid = screen.getByText("Test Title").nextElementSibling?.firstChild
    expect(dataGrid).toHaveStyle({ gridTemplateColumns: "30% 70%" })
  })
})
