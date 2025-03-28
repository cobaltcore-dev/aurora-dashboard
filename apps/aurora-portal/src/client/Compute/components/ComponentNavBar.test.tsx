import { describe, it, vi } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { ComputeNavBar } from "./ComputeNavBar"
import { AuroraProvider } from "../../Shell/AuroraProvider"

describe("ComputeNavBar", () => {
  it("renders the Compute navigation bar", async () => {
    await act(() =>
      render(
        <AuroraProvider>
          <ComputeNavBar viewMode="list" setViewMode={vi.fn()} />
        </AuroraProvider>
      )
    )
    expect(screen.getByText("Server")).toBeInTheDocument()
  })

  it("renders search bar with placeholder text", async () => {
    await act(() =>
      render(
        <AuroraProvider>
          <ComputeNavBar viewMode="list" setViewMode={vi.fn()} />
        </AuroraProvider>
      )
    )
    expect(screen.getAllByTestId("combobox-button").length).toBe(2)
  })

  it("switches to card view when clicking the Card button", async () => {
    const setViewMode = vi.fn()
    render(
      <AuroraProvider>
        <ComputeNavBar viewMode="list" setViewMode={setViewMode} />
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
        <ComputeNavBar viewMode="card" setViewMode={setViewMode} />
      </AuroraProvider>
    )

    const listButton = screen.getByTestId("list-view")

    await act(async () => await fireEvent.click(listButton))

    expect(setViewMode).toHaveBeenCalledWith("list")
  })

  it("updates search term when typing in the search input", async () => {
    render(
      <AuroraProvider>
        <ComputeNavBar viewMode="list" setViewMode={vi.fn()} />
      </AuroraProvider>
    )

    const searchInput = screen.getByPlaceholderText("Search...")
    fireEvent.change(searchInput, { target: { value: "test search" } })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
    })

    expect(searchInput).toHaveValue("test search")
  })
})
