import { describe, it, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ProjectsOverviewNavBar } from "./ProjectOverviewNavBar"
import { AuroraProvider } from "../../Shell/AuroraProvider"

describe("ProjectsOverviewNavBar", () => {
  it("renders the ProjectsOverviewNavBar with search input", async () => {
    await act(() =>
      render(
        <AuroraProvider>
          <ProjectsOverviewNavBar viewMode="list" setViewMode={vi.fn()} />
        </AuroraProvider>
      )
    )
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
  })

  it("updates search term when typing in the search input", async () => {
    render(
      <AuroraProvider>
        <ProjectsOverviewNavBar viewMode="list" setViewMode={vi.fn()} />
      </AuroraProvider>
    )

    const searchInput = screen.getByPlaceholderText("Search...")
    fireEvent.change(searchInput, { target: { value: "test search" } })

    // Wait for the debounce timeout
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
    })

    // Assert that the search term is updated in the component state
    expect(searchInput).toHaveValue("test search")
  })

  it("switches to card view when clicking the Card button", async () => {
    const setViewMode = vi.fn()
    render(
      <AuroraProvider>
        <ProjectsOverviewNavBar viewMode="list" setViewMode={setViewMode} />
      </AuroraProvider>
    )

    const cardButton = screen.getByTestId("card-view")
    await act(async () => await fireEvent.click(cardButton))

    expect(setViewMode).toHaveBeenCalledWith("card")
  })

  it("switches to list view when clicking the List button", async () => {
    const setViewMode = vi.fn()
    render(
      <AuroraProvider>
        <ProjectsOverviewNavBar viewMode="card" setViewMode={setViewMode} />
      </AuroraProvider>
    )

    const listButton = screen.getByTestId("list-view")
    await act(async () => await fireEvent.click(listButton))

    expect(setViewMode).toHaveBeenCalledWith("list")
  })
})
