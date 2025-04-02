import { render, screen, fireEvent, act } from "@testing-library/react"
import { Search } from "./Search"
import { describe, it, expect, vi } from "vitest"

describe("Search Component", () => {
  it("calls onChange after debounce delay", async () => {
    const mockOnChange = vi.fn()
    render(<Search onChange={mockOnChange} />)

    const searchInput = screen.getByPlaceholderText("Search...")
    fireEvent.change(searchInput, { target: { value: "test" } })

    // Wait for the debounce timeout
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
    })

    expect(mockOnChange).toHaveBeenCalledWith("test")
    expect(mockOnChange).toHaveBeenCalledTimes(1)
  })

  it("does not call onChange before debounce delay", async () => {
    const mockOnChange = vi.fn()
    render(<Search onChange={mockOnChange} />)

    const searchInput = screen.getByPlaceholderText("Search...")
    fireEvent.change(searchInput, { target: { value: "test" } })

    // Check before the debounce delay
    expect(mockOnChange).not.toHaveBeenCalled()

    // Wait for the debounce timeout
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 500))
    })

    expect(mockOnChange).toHaveBeenCalledWith("test")
  })
})
