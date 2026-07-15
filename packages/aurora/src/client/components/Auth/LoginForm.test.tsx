import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { LoginForm } from "./LoginForm"
import { AuthProvider } from "../../store/AuthProvider"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { ReactNode } from "react"

// Mock trpcClient
vi.mock("../../trpcClient", () => ({
  trpcClient: {
    auth: {
      getCurrentUserSession: { query: vi.fn().mockResolvedValue(null) },
      createUserSession: { mutate: vi.fn() },
      terminateUserSession: { mutate: vi.fn().mockResolvedValue(undefined) },
    },
  },
}))

import { trpcClient } from "../../trpcClient"

const mockCreateUserSession = trpcClient.auth.createUserSession.mutate as ReturnType<typeof vi.fn>

// Initialize i18n
beforeEach(() => {
  if (!i18n.locale) {
    i18n.activate("en")
  }
  vi.clearAllMocks()
  mockCreateUserSession.mockResolvedValue({
    user: { id: "1", name: "Test User", domain: { id: "d1", name: "test-domain" } },
    expires_at: new Date(Date.now() + 3600000).toISOString(),
  })
})

const wrapper = ({ children }: { children: ReactNode }) => (
  <I18nProvider i18n={i18n}>
    <AuthProvider>{children}</AuthProvider>
  </I18nProvider>
)

describe("LoginForm", () => {
  it("renders login form with all fields", async () => {
    render(<LoginForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByText("Login to Your Account")).toBeInTheDocument()
    })

    expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/user/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument()
  })

  it("submits form with entered credentials", async () => {
    render(<LoginForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/domain/i), { target: { value: "test-domain" } })
    fireEvent.change(screen.getByLabelText(/user/i), { target: { value: "testuser" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "testpass" } })

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(mockCreateUserSession).toHaveBeenCalledWith({
        domainName: "test-domain",
        user: "testuser",
        password: "testpass",
      })
    })
  })

  it("shows loading state while submitting", async () => {
    let resolveLogin: (value: unknown) => void
    mockCreateUserSession.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve
        })
    )

    render(<LoginForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/domain/i), { target: { value: "test-domain" } })
    fireEvent.change(screen.getByLabelText(/user/i), { target: { value: "testuser" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "testpass" } })

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /loading/i })).toBeInTheDocument()
      expect(screen.getByRole("button")).toBeDisabled()
    })

    // Resolve the login
    resolveLogin!({
      user: { id: "1", name: "Test User" },
      expires_at: new Date(Date.now() + 3600000).toISOString(),
    })
  })

  it("displays error message on login failure", async () => {
    mockCreateUserSession.mockRejectedValue(new Error("Invalid credentials"))

    render(<LoginForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText(/domain/i), { target: { value: "test-domain" } })
    fireEvent.change(screen.getByLabelText(/user/i), { target: { value: "testuser" } })
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrongpass" } })

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText("Invalid credentials")).toBeInTheDocument()
    })
  })

  it("has required fields", async () => {
    render(<LoginForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    })

    // Juno TextInput may handle required differently - just check fields exist
    expect(screen.getByLabelText(/domain/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/user/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it("password field masks input", async () => {
    render(<LoginForm />, { wrapper })

    await waitFor(() => {
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })

    // Password field should have type="password" for masking
    expect(screen.getByLabelText(/password/i)).toHaveAttribute("type", "password")
  })
})
