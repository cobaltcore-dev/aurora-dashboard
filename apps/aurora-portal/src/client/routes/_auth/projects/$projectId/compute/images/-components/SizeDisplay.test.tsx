import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import { SizeDisplay } from "./SizeDisplay"

describe("SizeDisplay", () => {
  describe("when size is undefined", () => {
    it("should render N/A", () => {
      render(<SizeDisplay size={undefined} />)
      expect(screen.getByText("N/A")).toBeInTheDocument()
    })
  })

  describe("when size is 0", () => {
    it("should render 0 B", () => {
      render(<SizeDisplay size={0} />)
      expect(screen.getByText("0 B")).toBeInTheDocument()
    })
  })

  describe("formatBytes conversions (decimal / SI, powers of 1000)", () => {
    it("should format bytes correctly", () => {
      // 500 < 1000, stays as B
      render(<SizeDisplay size={500} />)
      expect(screen.getByText("500 B")).toBeInTheDocument()
    })

    it("should format KB correctly", () => {
      // 1000 / 1000 = 1.00 KB
      render(<SizeDisplay size={1000} />)
      expect(screen.getByText("1 KB")).toBeInTheDocument()
    })

    it("should format KB with decimals", () => {
      // 1500 / 1000 = 1.50 KB
      render(<SizeDisplay size={1500} />)
      expect(screen.getByText("1.5 KB")).toBeInTheDocument()
    })

    it("should format MB correctly", () => {
      // 1_000_000 / 1000^2 = 1.00 MB
      render(<SizeDisplay size={1000000} />)
      expect(screen.getByText("1 MB")).toBeInTheDocument()
    })

    it("should format MB with decimals", () => {
      // 5_000_000 / 1000^2 = 5.00 MB
      render(<SizeDisplay size={5000000} />)
      expect(screen.getByText("5 MB")).toBeInTheDocument()
    })

    it("should format GB correctly", () => {
      // 1_000_000_000 / 1000^3 = 1.00 GB
      render(<SizeDisplay size={1000000000} />)
      expect(screen.getByText("1 GB")).toBeInTheDocument()
    })

    it("should format GB with decimals", () => {
      // 2_000_000_000 / 1000^3 = 2.00 GB
      render(<SizeDisplay size={2000000000} />)
      expect(screen.getByText("2 GB")).toBeInTheDocument()
    })

    it("should format TB correctly", () => {
      // 1_000_000_000_000 / 1000^4 = 1.00 TB
      render(<SizeDisplay size={1000000000000} />)
      expect(screen.getByText("1 TB")).toBeInTheDocument()
    })

    it("should handle large numbers with proper precision", () => {
      // 1_234_567_890 / 1000^3 = 1.23 GB
      render(<SizeDisplay size={1234567890} />)
      expect(screen.getByText("1.23 GB")).toBeInTheDocument()
    })

    it("should handle fractional bytes with rounding", () => {
      // 1234 / 1000 = 1.23 KB
      render(<SizeDisplay size={1234} />)
      expect(screen.getByText("1.23 KB")).toBeInTheDocument()
    })
  })

  describe("edge cases", () => {
    it("should handle very small sizes", () => {
      // 1 B
      render(<SizeDisplay size={1} />)
      expect(screen.getByText("1 B")).toBeInTheDocument()
    })

    it("should handle very large sizes", () => {
      // 1_000_000_000_000_000 / 1000^5 = 1.00 PB
      render(<SizeDisplay size={1000000000000000} />)
      expect(screen.getByText("1 PB")).toBeInTheDocument()
    })

    it("should handle null size", () => {
      render(<SizeDisplay size={null} />)
      expect(screen.getByText("0 B")).toBeInTheDocument()
    })
  })
})
