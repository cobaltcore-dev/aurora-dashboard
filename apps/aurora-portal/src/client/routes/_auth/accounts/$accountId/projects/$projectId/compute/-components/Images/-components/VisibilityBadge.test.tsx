import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { VisibilityBadge } from "./VisibilityBadge"

describe("VisibilityBadge", () => {
  describe("when visibility is undefined or empty", () => {
    it("should render Unknown when visibility is undefined", () => {
      render(<VisibilityBadge visibility={undefined} />)
      expect(screen.getByText("Unknown")).toBeInTheDocument()
    })

    it("should render Unknown when visibility is empty string", () => {
      render(<VisibilityBadge visibility="" />)
      expect(screen.getByText("Unknown")).toBeInTheDocument()
    })
  })

  describe("public visibility", () => {
    it("should render info icon with correct color for public visibility", () => {
      render(<VisibilityBadge visibility="public" />)

      const icon = screen.getByTestId("icon-info")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-info")).toBe(true)
      expect(screen.getByText("public")).toBeInTheDocument()
    })
  })

  describe("private visibility", () => {
    it("should render warning icon for private visibility", () => {
      render(<VisibilityBadge visibility="private" />)

      const icon = screen.getByTestId("icon-warning")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-warning")).toBe(true)
      expect(screen.getByText("private")).toBeInTheDocument()
    })
  })

  describe("shared visibility", () => {
    it("should render success icon for shared visibility", () => {
      render(<VisibilityBadge visibility="shared" />)

      const icon = screen.getByTestId("icon-success")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-success")).toBe(true)
      expect(screen.getByText("shared")).toBeInTheDocument()
    })
  })

  describe("custom visibility values", () => {
    it("should render only text without icon for custom visibility", () => {
      render(<VisibilityBadge visibility="community" />)

      // Should not find an icon
      expect(screen.queryByTestId(/^icon-/)).not.toBeInTheDocument()

      // Should find two instances of the text (one in conditional, one always displayed)
      const textElement = screen.getByText("community")
      expect(textElement).toBeInTheDocument()
    })

    it("should render only text for unknown visibility values", () => {
      render(<VisibilityBadge visibility="custom-visibility" />)

      expect(screen.queryByTestId(/^icon-/)).not.toBeInTheDocument()
      const textElement = screen.getByText("custom-visibility")
      expect(textElement).toBeInTheDocument()
    })
  })

  describe("component structure", () => {
    it("should render with correct flex layout classes for known visibility", () => {
      const { container } = render(<VisibilityBadge visibility="public" />)
      const divElement = container.querySelector(".flex.items-center.space-x-2")
      expect(divElement).toBeInTheDocument()
    })

    it("should always render visibility text alongside icon for known types", () => {
      render(<VisibilityBadge visibility="public" />)
      expect(screen.getByTestId("icon-info")).toBeInTheDocument()
      expect(screen.getByText("public")).toBeInTheDocument()
    })

    it("should render visibility text in flex container for custom types", () => {
      const { container } = render(<VisibilityBadge visibility="custom" />)
      const divElement = container.querySelector(".flex.items-center.space-x-2")
      expect(divElement).toBeInTheDocument()
    })
  })

  describe("text rendering consistency", () => {
    it("should render visibility text once for unknown types", () => {
      render(<VisibilityBadge visibility="custom" />)
      const textElement = screen.getByText("custom")
      expect(textElement).toBeInTheDocument()
    })

    it("should render visibility text once for known types", () => {
      render(<VisibilityBadge visibility="public" />)
      const textElement = screen.getByText("public")
      expect(textElement).toBeInTheDocument()
    })
  })
})
