import { render, screen } from "@testing-library/react"
import { StatusBadge } from "./StatusBadge"

describe("StatusBadge", () => {
  describe("when status is undefined or empty", () => {
    it("should render Unknown when status is undefined", () => {
      render(<StatusBadge status={undefined} />)
      expect(screen.getByText("Unknown")).toBeInTheDocument()
    })

    it("should render Unknown when status is empty string", () => {
      render(<StatusBadge status="" />)
      expect(screen.getByText("Unknown")).toBeInTheDocument()
    })
  })

  describe("active status", () => {
    it("should render success icon with correct color for active status", () => {
      render(<StatusBadge status="active" />)

      const icon = screen.getByTestId("icon-success")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-success")).toBe(true)
      expect(screen.getByText("active")).toBeInTheDocument()
    })
  })

  describe("deleted or killed status", () => {
    it("should render danger icon for deleted status", () => {
      render(<StatusBadge status="deleted" />)

      const icon = screen.getByTestId("icon-danger")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-danger")).toBe(true)
      expect(screen.getByText("deleted")).toBeInTheDocument()
    })

    it("should render danger icon for killed status", () => {
      render(<StatusBadge status="killed" />)

      const icon = screen.getByTestId("icon-danger")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-danger")).toBe(true)
      expect(screen.getByText("killed")).toBeInTheDocument()
    })
  })

  describe("queued, saving, or importing status", () => {
    it("should render warning icon for queued status", () => {
      render(<StatusBadge status="queued" />)

      const icon = screen.getByTestId("icon-waring")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-warning")).toBe(true)
      expect(screen.getByText("queued")).toBeInTheDocument()
    })

    it("should render warning icon for saving status", () => {
      render(<StatusBadge status="saving" />)

      const icon = screen.getByTestId("icon-waring")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-warning")).toBe(true)
      expect(screen.getByText("saving")).toBeInTheDocument()
    })

    it("should render warning icon for importing status", () => {
      render(<StatusBadge status="importing" />)

      const icon = screen.getByTestId("icon-waring")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-warning")).toBe(true)
      expect(screen.getByText("importing")).toBeInTheDocument()
    })
  })

  describe("other status values", () => {
    it("should render info icon for pending status", () => {
      render(<StatusBadge status="pending" />)

      const icon = screen.getByTestId("icon-info")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-info")).toBe(true)
      expect(screen.getByText("pending")).toBeInTheDocument()
    })

    it("should render info icon for unknown status values", () => {
      render(<StatusBadge status="custom-status" />)

      const icon = screen.getByTestId("icon-info")
      expect(icon).toBeInTheDocument()
      expect(icon.classList.contains("jn-text-theme-info")).toBe(true)
      expect(screen.getByText("custom-status")).toBeInTheDocument()
    })
  })

  describe("component structure", () => {
    it("should render with correct flex layout classes", () => {
      const { container } = render(<StatusBadge status="active" />)
      const divElement = container.querySelector(".flex.items-center.space-x-2")
      expect(divElement).toBeInTheDocument()
    })

    it("should always render status text alongside icon", () => {
      render(<StatusBadge status="active" />)
      expect(screen.getByTestId("icon-success")).toBeInTheDocument()
      expect(screen.getByText("active")).toBeInTheDocument()
    })
  })
})
