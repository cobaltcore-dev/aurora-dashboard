import { render, screen, fireEvent, act } from "@testing-library/react"
import { vi } from "vitest"
import { AuthMenu } from "./AuthMenu" // Adjust the import as necessary
import { StoreProvider, useAuthDispatch } from "../store/StoreProvider" // Adjust based on your file structure
import { TrpcClient } from "../trpcClient"
import { useEffect } from "react"

const SyncAuth = () => {
  const dispatch = useAuthDispatch()
  useEffect(() => {
    dispatch({
      type: "LOGIN_SUCCESS",
      payload: {
        user: {
          name: "John Doe",
          id: "12345",
          domain: { id: "test", name: "test" },
          password_expires_at: new Date().toISOString(),
        },
        sessionExpiresAt: `${Date.now() + 1000}`,
      },
    })
  }, [])
  return null
}

describe("AuthMenu Component", () => {
  const trpcClient: TrpcClient["auth"] = {
    getCurrentUserSession: {
      query: vi.fn(),
    },
    terminateUserSession: {
      mutate: vi.fn(),
    },
    createUserSession: {
      mutate: vi.fn(),
    },
    getAuthToken: {
      query: vi.fn(),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Sign In button when not authenticated", () => {
    trpcClient.getCurrentUserSession.query = vi.fn().mockResolvedValueOnce(null) // Mock no token

    render(
      <StoreProvider>
        <AuthMenu authClient={trpcClient} />
      </StoreProvider>
    )

    expect(screen.getByText(/Sign In/i)).toBeInTheDocument()
  })

  it("renders user info and Sign Out button when authenticated", async () => {
    trpcClient.getCurrentUserSession.query = vi.fn().mockReturnValue({
      user: { name: "John Doe" },
      sessionExpiresAt: Date.now() + 1000,
    })

    render(
      <StoreProvider>
        <SyncAuth />
        <AuthMenu authClient={trpcClient} />
      </StoreProvider>
    )

    expect(screen.getByText(/John Doe/i)).toBeInTheDocument()
    expect(screen.getByText(/Sign Out/i)).toBeInTheDocument()
  })

  it("calls logout function on Sign Out button click", async () => {
    trpcClient.terminateUserSession.mutate = vi.fn().mockResolvedValueOnce(undefined) // Mock successful logout
    trpcClient.getCurrentUserSession.query = vi.fn().mockReturnValue({
      user: { name: "John Doe" },
      sessionExpiresAt: Date.now() + 1000,
    })

    render(
      <StoreProvider>
        <SyncAuth />
        <AuthMenu authClient={trpcClient} />
      </StoreProvider>
    )
    await act(async () => {
      await fireEvent.click(screen.getByText(/Sign Out/i))
    })

    expect(trpcClient.terminateUserSession.mutate).toHaveBeenCalled()
  })
})
