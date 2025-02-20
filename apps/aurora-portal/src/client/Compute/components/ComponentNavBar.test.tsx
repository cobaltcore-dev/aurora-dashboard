import { describe, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ComputeNavBar } from "./ComputeNavBar"

describe("ComputeNavBar", () => {
  it("renders the title", () => {
    render(<ComputeNavBar viewMode="list" setViewMode={vi.fn()} />)
    expect(screen.getByText("Server List")).toBeInTheDocument()
  })

  it("renders search bar with icon", () => {
    render(<ComputeNavBar viewMode="list" setViewMode={vi.fn()} />)

    expect(screen.getByPlaceholderText("Search servers...")).toBeInTheDocument()
  })

  it("calls setViewMode when switching to card view", () => {
    const setViewMode = vi.fn()
    render(<ComputeNavBar viewMode="list" setViewMode={setViewMode} />)

    const cardButton = screen.getByText("Card")
    fireEvent.click(cardButton)

    expect(setViewMode).toHaveBeenCalledWith("card")
  })

  it("calls setViewMode when switching to list view", () => {
    const setViewMode = vi.fn()
    render(<ComputeNavBar viewMode="card" setViewMode={setViewMode} />)

    const listButton = screen.getByText("List")
    fireEvent.click(listButton)

    expect(setViewMode).toHaveBeenCalledWith("list")
  })
})
