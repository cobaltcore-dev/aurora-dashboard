import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { NotificationText } from "./NotificationText"

describe("NotificationText", () => {
  it("renders title and description text", () => {
    render(<NotificationText title="Test Title" description="Test Description" />)

    expect(screen.getByText("Test Title")).toBeInTheDocument()
    expect(screen.getByText("Test Description")).toBeInTheDocument()
  })

  it("renders ReactNode elements as title and description", () => {
    render(<NotificationText title={<strong>Bold Title</strong>} description={<em>Italic Description</em>} />)

    expect(screen.getByText("Bold Title")).toBeInTheDocument()
    expect(screen.getByText("Italic Description")).toBeInTheDocument()
  })

  it("applies correct className to description", () => {
    render(<NotificationText title="Title" description="Description" />)

    const description = screen.getByText("Description")
    expect(description).toHaveClass("text-theme-light")
  })

  it("renders Stack component with correct props", () => {
    const { container } = render(<NotificationText title="Title" description="Description" />)

    const stackElement = container.firstChild
    expect(stackElement).toBeInTheDocument()
  })

  it("renders complex ReactNode content", () => {
    render(
      <NotificationText
        title={
          <div>
            <span>Part 1</span>
            <span>Part 2</span>
          </div>
        }
        description={
          <>
            <span>Description part 1</span>
            <span>Description part 2</span>
          </>
        }
      />
    )

    expect(screen.getByText("Part 1")).toBeInTheDocument()
    expect(screen.getByText("Part 2")).toBeInTheDocument()
    expect(screen.getByText("Description part 1")).toBeInTheDocument()
    expect(screen.getByText("Description part 2")).toBeInTheDocument()
  })
})
