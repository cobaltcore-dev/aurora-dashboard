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
    it("should render 0 Bytes", () => {
      render(<SizeDisplay size={0} />)
      expect(screen.getByText("0 Bytes")).toBeInTheDocument()
    })
  })

  describe("formatBytes conversions", () => {
    it("should format bytes correctly", () => {
      render(<SizeDisplay size={500} />)
      expect(screen.getByText("500 Bytes")).toBeInTheDocument()
    })

    it("should format KB correctly", () => {
      render(<SizeDisplay size={1024} />)
      expect(screen.getByText("1 KB")).toBeInTheDocument()
    })

    it("should format KB with decimals", () => {
      render(<SizeDisplay size={1536} />)
      expect(screen.getByText("1.5 KB")).toBeInTheDocument()
    })

    it("should format MB correctly", () => {
      render(<SizeDisplay size={1048576} />)
      expect(screen.getByText("1 MB")).toBeInTheDocument()
    })

    it("should format MB with decimals", () => {
      render(<SizeDisplay size={5242880} />)
      expect(screen.getByText("5 MB")).toBeInTheDocument()
    })

    it("should format GB correctly", () => {
      render(<SizeDisplay size={1073741824} />)
      expect(screen.getByText("1 GB")).toBeInTheDocument()
    })

    it("should format GB with decimals", () => {
      render(<SizeDisplay size={2147483648} />)
      expect(screen.getByText("2 GB")).toBeInTheDocument()
    })

    it("should format TB correctly", () => {
      render(<SizeDisplay size={1099511627776} />)
      expect(screen.getByText("1 TB")).toBeInTheDocument()
    })

    it("should handle large numbers with proper precision", () => {
      render(<SizeDisplay size={1234567890} />)
      expect(screen.getByText("1.15 GB")).toBeInTheDocument()
    })

    it("should handle fractional bytes with rounding", () => {
      render(<SizeDisplay size={1234} />)
      expect(screen.getByText("1.21 KB")).toBeInTheDocument()
    })
  })

  describe("edge cases", () => {
    it("should handle very small sizes", () => {
      render(<SizeDisplay size={1} />)
      expect(screen.getByText("1 Bytes")).toBeInTheDocument()
    })

    it("should handle very large sizes", () => {
      render(<SizeDisplay size={1125899906842624} />)
      expect(screen.getByText("1 PB")).toBeInTheDocument()
    })
  })
})
