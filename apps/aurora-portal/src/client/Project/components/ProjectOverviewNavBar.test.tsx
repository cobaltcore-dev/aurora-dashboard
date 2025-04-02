import { describe, it, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ProjectsOverviewNavBar } from "./ProjectOverviewNavBar"

describe("ProjectsOverviewNavBar", () => {
  it("renders the ProjectsOverviewNavBar with search input", async () => {
    await act(() => render(<ProjectsOverviewNavBar viewMode="list" setViewMode={vi.fn()} onChange={() => {}} />))
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
  })

  it("updates search term when typing in the search input", async () => {
    const setSearchterm = vi.fn()

    render(<ProjectsOverviewNavBar viewMode="list" setViewMode={vi.fn()} onChange={setSearchterm} />)

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
    render(<ProjectsOverviewNavBar viewMode="list" setViewMode={setViewMode} onChange={() => {}} />)

    const cardButton = screen.getByTestId("card-view")
    await act(async () => await fireEvent.click(cardButton))

    expect(setViewMode).toHaveBeenCalledWith("card")
  })

  it("switches to list view when clicking the List button", async () => {
    const setViewMode = vi.fn()
    render(<ProjectsOverviewNavBar viewMode="card" setViewMode={setViewMode} onChange={() => {}} />)

    const listButton = screen.getByTestId("list-view")
    await act(async () => await fireEvent.click(listButton))

    expect(setViewMode).toHaveBeenCalledWith("list")
  })
})
