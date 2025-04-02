import { describe, it, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ComputeNavBar } from "./ComputeNavBar"

describe("ComputeNavBar", () => {
  it("renders the Compute navigation bar", async () => {
    await act(() => render(<ComputeNavBar viewMode="list" setViewMode={vi.fn()} onChange={() => {}} />))
    expect(screen.getByText("Server")).toBeInTheDocument()
  })

  it("renders search bar with placeholder text", async () => {
    await act(() => render(<ComputeNavBar viewMode="list" setViewMode={vi.fn()} onChange={() => {}} />))
    expect(screen.getAllByTestId("combobox-button").length).toBe(2)
  })

  it("updates search term when typing in the search input", async () => {
    const setSearchterm = vi.fn()

    render(<ComputeNavBar viewMode="list" setViewMode={vi.fn()} onChange={setSearchterm} />)

    const searchInput = screen.getByPlaceholderText("Search...")
    fireEvent.change(searchInput, { target: { value: "test search" } })

    // Wait for the debounce timeout
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
    })

    expect(setSearchterm).toHaveBeenCalledWith("test search")
  })

  it("switches to card view when clicking the Card button", async () => {
    const setViewMode = vi.fn()
    render(<ComputeNavBar viewMode="list" setViewMode={setViewMode} onChange={() => {}} />)

    const cardButton = screen.getByTestId("card-view")
    await act(async () => await fireEvent.click(cardButton))

    expect(setViewMode).toHaveBeenCalledWith("card")
  })

  it("switches to list view when clicking the List button", async () => {
    const setViewMode = vi.fn()
    render(<ComputeNavBar viewMode="card" setViewMode={setViewMode} onChange={() => {}} />)

    const listButton = screen.getByTestId("list-view")

    await act(async () => await fireEvent.click(listButton))

    expect(setViewMode).toHaveBeenCalledWith("list")
  })
})
