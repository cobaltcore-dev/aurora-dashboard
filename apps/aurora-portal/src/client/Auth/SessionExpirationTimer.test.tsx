import { render, screen, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import { SessionExpirationTimer } from "./SessionExpirationTimer"

describe("SessionExpirationTimer", () => {
  it("renders correctly with initial time left", () => {
    const expirationDate = new Date(Date.now() + 1000 * 60 * 5) // 5 minutes from now
    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} />)

    const timeLeftElement = screen.getByText(/m/i) // Check for minutes in the text
    expect(timeLeftElement).toBeInTheDocument()
  })

  it('displays "expired!" when the session expires', async () => {
    const expirationDate = new Date(Date.now() - 1000) // 1 second ago
    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} />)

    const expiredMessage = await screen.findByText(/expired/i) // Find the expired message
    expect(expiredMessage).toBeInTheDocument()
  })

  it("calls logout when session expires and logout function is provided", async () => {
    const expirationDate = new Date(Date.now() - 1000) // 1 second ago
    const mockLogout = vi.fn()

    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} logout={mockLogout} />)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1) // Verify logout is called once
    })
  })

  it("does not call logout if session has not expired yet", async () => {
    const expirationDate = new Date(Date.now() + 5000) // 5 seconds from now
    const mockLogout = vi.fn()

    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} logout={mockLogout} />)

    await waitFor(
      () => {
        expect(mockLogout).not.toHaveBeenCalled() // Logout should not be called
      },
      { timeout: 7000 }
    ) // Adjust timeout if necessary
  })

  it("correctly cleans up interval and timeout on unmount", () => {
    const expirationDate = new Date(Date.now() + 1000 * 60) // 1 minute from now
    const mockLogout = vi.fn()
    const { unmount } = render(
      <SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} logout={mockLogout} />
    )

    const intervalSpy = vi.spyOn(global, "clearInterval")
    const timeoutSpy = vi.spyOn(global, "clearTimeout")

    unmount()

    expect(intervalSpy).toHaveBeenCalled() // Ensure interval is cleared
    expect(timeoutSpy).toHaveBeenCalled() // Ensure timeout is cleared
  })

  it("renders with custom className", () => {
    const expirationDate = new Date(Date.now() + 1000 * 60 * 5) // 5 minutes from now
    render(<SessionExpirationTimer passwordExpiresAt={expirationDate.toISOString()} className="custom-class" />)

    const divElement = screen.getByText(/m/i) // Check for minutes in the text
    expect(divElement).toHaveClass("custom-class") // Check if the custom class is applied
  })
})
