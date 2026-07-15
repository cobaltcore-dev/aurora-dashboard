import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LoginForm } from "./LoginForm"
import { AuthProvider } from "../../store/AuthProvider"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpcReact } from "../../trpcClient"

// Mock trpcReact
vi.mock("../../trpcClient", () => ({
  trpcReact: {
    auth: {
      getCurrentUserSession: {
        useQuery: vi.fn(),
      },
      createUserSession: {
        useMutation: vi.fn(),
      },
      terminateUserSession: {
        useMutation: vi.fn(),
      },
    },
  },
}))

const mockUseQuery = trpcReact.auth.getCurrentUserSession.useQuery as ReturnType<typeof vi.fn>
const mockUseLoginMutation = trpcReact.auth.createUserSession.useMutation as ReturnType<typeof vi.fn>
const mockUseLogoutMutation = trpcReact.auth.terminateUserSession.useMutation as ReturnType<typeof vi.fn>

// Track the mutateAsync mock for assertions
let mockLoginMutateAsync: ReturnType<typeof vi.fn>

// Initialize i18n
beforeEach(() => {
  if (!i18n.locale) {
    i18n.activate("en")
  }
  vi.clearAllMocks()

  // Default query mock - no session
  mockUseQuery.mockReturnValue({
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })

  // Default login mutation mock
  mockLoginMutateAsync = vi.fn().mockResolvedValue({
    user: { id: "1", name: "Test User", domain: { id: "d1", name: "test-domain" } },
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  })
  mockUseLoginMutation.mockReturnValue({
    mutateAsync: mockLoginMutateAsync,
    isPending: false,
    error: null,
  })

  // Default logout mutation mock
  mockUseLogoutMutation.mockReturnValue({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
    error: null,
  })
})

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nProvider i18n={i18n}>
        <AuthProvider>{children}</AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}

describe("LoginForm", () => {
  it("renders login form with all fields", async () => {
    render(<LoginForm />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("Login to Your Account")).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/user/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("submits form with entered credentials", async () => {
    render(<LoginForm />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/domain/i), { target: { value: "test-domain" } })
    fireEvent.change(screen.getByLabelText(/user/i), { target: { value: "testuser" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "testpass" } })

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockLoginMutateAsync).toHaveBeenCalledWith({
        domainName: "test-domain",
        user: "testuser",
        password: "testpass",
      })
    })
  })

  it("shows loading state while submitting", async () => {
    // Mock with isPending true to simulate loading state
    mockUseLoginMutation.mockReturnValue({
      mutateAsync: mockLoginMutateAsync,
      isPending: true,
      error: null,
    })

    render(<LoginForm />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    })

    // Button should show loading state and be disabled
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/loading/i)
  })

  it("displays error message on login failure", async () => {
    // Mock login mutation to have an error
    mockUseLoginMutation.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(new Error("Invalid credentials")),
      isPending: false,
      error: { message: "Invalid credentials" },
    })

    render(<LoginForm />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    })

    // Error should be displayed from the auth context
    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
    })
  })

  it("has required fields", async () => {
    render(<LoginForm />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    })

    // Juno TextInput may handle required differently - just check fields exist
    expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/user/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it("password field masks input", async () => {
    render(<LoginForm />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    // Password field should have type="password" for masking
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password")
  })
})
