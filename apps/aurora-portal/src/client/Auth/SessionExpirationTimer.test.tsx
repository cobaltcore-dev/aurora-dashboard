import { render, screen, waitFor, act } from "@testing-library/react"
import { vi } from "vitest"
import { SessionExpirationTimer } from "./SessionExpirationTimer"

describe("SessionExpirationTimer", () => {
  it("renders correctly with initial time left", () => {
    const expirationDate = new Date(Date.now() + 1000 * 60 * 60) // 1 hour from now
    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} />)

    const timeLeftElement = screen.getByText(/s/)
    expect(timeLeftElement).toBeInTheDocument()
  })

  it("counts down correctly every second", async () => {
    const expirationDate = new Date(Date.now() + 5000) // 5 seconds from now
    act(() => render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} />))

    const initialTimeLeft = screen.getByText(/s/)
    expect(initialTimeLeft).toBeInTheDocument()

    await waitFor(() => {
      const updatedTimeLeft = screen.getByText(/s/)
      expect(updatedTimeLeft).not.toBe(initialTimeLeft)
    })
  })

  it("displays expired when the session expires", async () => {
    const expirationDate = new Date(Date.now() - 1000) // 1 second ago
    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} />)

    const timeLeftElement = screen.getByText(/expired/)
    expect(timeLeftElement).toBeInTheDocument()
  })

  it("calls logout when session expires and logout function is provided", async () => {
    const expirationDate = new Date(Date.now() - 1000) // 1 second ago
    const mockLogout = vi.fn()

    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} logout={mockLogout} />)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
    })
  })

  it("does not call logout if session has not expired yet", async () => {
    const expirationDate = new Date(Date.now() + 5000) // 5 seconds from now
    const mockLogout = vi.fn()

    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} logout={mockLogout} />)

    await waitFor(() => {
      expect(mockLogout).not.toHaveBeenCalled()
    })
  })

  it("correctly cleans up interval and timeout on unmount", () => {
    const expirationDate = new Date(Date.now() + 1000 * 60 * 60) // 1 hour from now
    const mockLogout = vi.fn()
    const { unmount } = render(
      <SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} logout={mockLogout} />
    )

    const intervalSpy = vi.spyOn(global, "clearInterval")
    const timeoutSpy = vi.spyOn(global, "clearTimeout")

    unmount()

    expect(intervalSpy).toHaveBeenCalled()
    expect(timeoutSpy).toHaveBeenCalled()
  })

  it("renders with custom className", () => {
    const expirationDate = new Date(Date.now() + 1000 * 60 * 60) // 1 hour from now
    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} className="custom-class" />)

    const divElement = screen.getByText(/s/)
    expect(divElement).toHaveClass("custom-class")
  })
})
