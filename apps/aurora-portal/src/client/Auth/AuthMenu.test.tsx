import { render, screen, fireEvent, act } from "@testing-library/react"
import { vi } from "vitest"
import { AuthMenu } from "./AuthMenu" // Adjust the import as necessary
import { StoreProvider, useAuthDispatch } from "../store/StoreProvider" // Adjust based on your file structure
import { TrpcClient } from "../trpcClient"
import { useEffect } from "react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { AuroraProvider } from "../Shell/AuroraProvider"

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

const renderWithAuth = (ui: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <AuroraProvider>
        <Routes>
          <Route path={"/"} element={ui} />
          <Route path="/1789d1/projects/89ac3f/compute" element={<div>Compute Page</div>} />
        </Routes>
      </AuroraProvider>
    </MemoryRouter>
  )
describe("AuthMenu Component", () => {
  const trpcClient: TrpcClient["auth"] = {
    getCurrentUserSession: { query: vi.fn() },
    setCurrentScope: { mutate: vi.fn() },
    terminateUserSession: { mutate: vi.fn() },
    createUserSession: { mutate: vi.fn() },
    getAuthToken: { query: vi.fn() },
    getCurrentScope: { query: vi.fn() },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Sign In button when not authenticated", () => {
    trpcClient.getCurrentUserSession.query = vi.fn().mockResolvedValueOnce(null) // Mock no token

    renderWithAuth(
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

    renderWithAuth(
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

    renderWithAuth(
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
