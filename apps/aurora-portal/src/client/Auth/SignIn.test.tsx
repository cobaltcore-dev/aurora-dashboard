import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { GlobalStateProvider } from "../global-state/GlobalStateProvider"
import { vi } from "vitest"
import { SignIn } from "./SignIn" // Adjust the import as necessary
import { TrpcClient } from "../trpcClient"
import { act } from "react"

describe("SignIn Component", () => {
  const trpcClient: TrpcClient["auth"] = {
    createUserSession: {
      mutate: vi.fn().mockResolvedValue({
        user: { name: "John Doe" },
        expires_at: new Date().toISOString(),
      }),
    },
    getCurrentUserSession: { query: vi.fn() },
    terminateUserSession: { mutate: vi.fn() },
    getAuthToken: { query: vi.fn() },
    setCurrentProject: { mutate: vi.fn() },
    setCurrentDomain: { mutate: vi.fn() },
  }

  const TestComponent = () => {
    return (
      <GlobalStateProvider>
        <SignIn trpcClient={trpcClient} />
      </GlobalStateProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders correctly when not authenticated", async () => {
    await act(async () => {
      render(<TestComponent />)
    })

    expect(screen.getByText(/Login to Your Account/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter your domain/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter your username/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument()
  })

  it("shows loading state while authenticating", async () => {
    await act(async () => {
      render(<TestComponent />)
    })

    fireEvent.change(screen.getByPlaceholderText(/Enter your domain/i), { target: { value: "my-domain" } })
    fireEvent.change(screen.getByPlaceholderText(/Enter your username/i), { target: { value: "my-username" } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: "my-password" } })

    fireEvent.click(screen.getByText(/Sign In/i)) // Remember to use the updated button text
    await waitFor(() => {
      expect(screen.getByText(/Loading.../i)).toBeInTheDocument()
    })
  })

  it("handles successful createUserSession", async () => {
    await act(async () => {
      render(<TestComponent />)
    })

    fireEvent.change(screen.getByPlaceholderText(/Enter your domain/i), { target: { value: "my-domain" } })
    fireEvent.change(screen.getByPlaceholderText(/Enter your username/i), { target: { value: "my-username" } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: "my-password" } })

    await act(async () => {
      fireEvent.click(screen.getByText(/Sign In/i))
    })

    await waitFor(() => {
      expect(screen.getByText(/Welcome back, John Doe!/i)).toBeInTheDocument()
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument()
    })
  })

  it("handles createUserSession failure", async () => {
    trpcClient.createUserSession.mutate = vi.fn().mockRejectedValue(new Error("Login failed"))

    await act(async () => {
      render(<TestComponent />)
    })

    fireEvent.change(screen.getByPlaceholderText(/Enter your domain/i), { target: { value: "my-domain" } })
    fireEvent.change(screen.getByPlaceholderText(/Enter your username/i), { target: { value: "my-username" } })
    fireEvent.change(screen.getByPlaceholderText(/••••••••/i), { target: { value: "my-password" } })

    await act(async () => {
      fireEvent.click(screen.getByText(/Sign In/i))
    })

    await waitFor(() => {
      expect(screen.getByText(/Login failed/i)).toBeInTheDocument()
      expect(screen.queryByText(/Loading.../i)).not.toBeInTheDocument()
    })
  })
  // Add more tests as needed...
})
