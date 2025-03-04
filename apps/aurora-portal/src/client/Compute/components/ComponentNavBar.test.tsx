import { describe, it, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ComputeNavBar } from "./ComputeNavBar"

describe("ComputeNavBar", () => {
  it("renders the Compute navigation bar", () => {
    render(<ComputeNavBar viewMode="list" setViewMode={vi.fn()} />)
    expect(screen.getByText("Server")).toBeInTheDocument()
  })

  it("renders search bar with placeholder text", () => {
    render(<ComputeNavBar viewMode="list" setViewMode={vi.fn()} />)
    expect(screen.getByDisplayValue("Sorting...")).toBeInTheDocument()
  })

  it("switches to card view when clicking the Card button", () => {
    const setViewMode = vi.fn()
    render(<ComputeNavBar viewMode="list" setViewMode={setViewMode} />)

    const cardButton = screen.getByTestId("card-view")
    fireEvent.click(cardButton)

    expect(setViewMode).toHaveBeenCalledWith("card")
  })

  it("switches to list view when clicking the List button", () => {
    const setViewMode = vi.fn()
    render(<ComputeNavBar viewMode="card" setViewMode={setViewMode} />)

    const listButton = screen.getByTestId("list-view")

    fireEvent.click(listButton)

    expect(setViewMode).toHaveBeenCalledWith("list")
  })
})
