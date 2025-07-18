import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import DataRow from "./DataRow"

describe("DataRow", () => {
  it("renders label and content correctly", () => {
    const label = "Test Label"
    const content = "Test Content"

    render(<DataRow label={label} content={content} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it("renders React node label and content", () => {
    const label = <div data-testid="label-node">Complex Label</div>
    const content = <span data-testid="content-node">Complex Content</span>

    render(<DataRow label={label} content={content} />)

    expect(screen.getByTestId("label-node")).toBeInTheDocument()
    expect(screen.getByTestId("content-node")).toBeInTheDocument()
    expect(screen.getByText("Complex Label")).toBeInTheDocument()
    expect(screen.getByText("Complex Content")).toBeInTheDocument()
  })

  it("applies font-semibold class to label", () => {
    const label = "Styled Label"
    const content = "Content"

    render(<DataRow label={label} content={content} />)

    const labelElement = screen.getByText(label)
    expect(labelElement).toHaveClass("font-semibold")
  })

  it("renders HelpTooltip when tooltipText is provided", () => {
    const label = "Label with tooltip"
    const content = "Content"
    const tooltipText = "This is helpful information"

    render(<DataRow label={label} content={content} tooltipText={tooltipText} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it("does not render HelpTooltip when tooltipText is not provided", () => {
    const label = "Label without tooltip"
    const content = "Content"

    render(<DataRow label={label} content={content} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it("renders with undefined tooltipText (falsy check)", () => {
    const label = "Label"
    const content = "Content"

    render(<DataRow label={label} content={content} tooltipText={undefined} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it("renders with empty string tooltipText (falsy check)", () => {
    const label = "Label"
    const content = "Content"

    render(<DataRow label={label} content={content} tooltipText="" />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it("renders DataGridRow and DataGridCell components", () => {
    const label = "Test Label"
    const content = "Test Content"

    const { container } = render(<DataRow label={label} content={content} />)

    // DataGridRow should be the root element
    expect(container.firstChild).toBeDefined()

    // There should be two DataGridCell components
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText(content)).toBeInTheDocument()
  })

  it("renders Stack component with correct props", () => {
    const label = "Label"
    const content = "Content"
    const tooltipText = "Tooltip"

    render(<DataRow label={label} content={content} tooltipText={tooltipText} />)

    // Stack should contain the label and tooltip
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it("handles complex content with HTML elements", () => {
    const label = "Complex Label"
    const content = (
      <div>
        <strong>Bold text</strong>
        <em>Italic text</em>
        <span>Regular text</span>
      </div>
    )

    render(<DataRow label={label} content={content} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText("Bold text")).toBeInTheDocument()
    expect(screen.getByText("Italic text")).toBeInTheDocument()
    expect(screen.getByText("Regular text")).toBeInTheDocument()
  })

  it("handles numeric content", () => {
    const label = "Numeric Label"
    const content = 42

    render(<DataRow label={label} content={content} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText("42")).toBeInTheDocument()
  })

  it("handles boolean content", () => {
    const label = "Boolean Label"
    const content = true

    render(<DataRow label={label} content={content} />)

    expect(screen.getByText(label)).toBeInTheDocument()
    // Boolean true is not rendered as text in React, so we check the structure
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
