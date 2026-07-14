import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { AuthProvider, useAuth } from "./AuthProvider"
import { ReactNode } from "react"

// Mock trpcClient
vi.mock("../trpcClient", () => ({
  trpcClient: {
    auth: {
      getCurrentUserSession: {
        query: vi.fn(),
      },
      createUserSession: {
        mutate: vi.fn(),
      },
      terminateUserSession: {
        mutate: vi.fn(),
      },
    },
  },
}))

import { trpcClient } from "../trpcClient"

const mockGetCurrentUserSession = trpcClient.auth.getCurrentUserSession.query as ReturnType<typeof vi.fn>
const mockCreateUserSession = trpcClient.auth.createUserSession.mutate as ReturnType<typeof vi.fn>
const mockTerminateUserSession = trpcClient.auth.terminateUserSession.mutate as ReturnType<typeof vi.fn>

const mockSession = {
  user: {
    id: "1",
    name: "Test User",
    domain: { id: "123", name: "Test Domain" },
    password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
}

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: no existing session
    mockGetCurrentUserSession.mockResolvedValue(null)
    mockTerminateUserSession.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Initialization", () => {
    it("should start with loading state and fetch current session", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(mockGetCurrentUserSession).toHaveBeenCalledOnce()
    })

    it("should restore session if one exists", async () => {
      mockGetCurrentUserSession.mockResolvedValue(mockSession)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockSession.user)
      expect(result.current.expiresAt).toBeInstanceOf(Date)
    })

    it("should set error if session fetch fails", async () => {
      mockGetCurrentUserSession.mockRejectedValue(new Error("Network error"))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe("Network error")
    })

    it("should throw error when used outside provider", () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow("useAuth must be used within an AuthProvider")
    })
  })

  describe("Login", () => {
    it("should authenticate user on successful login", async () => {
      mockCreateUserSession.mockResolvedValue(mockSession)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let loginResult: { success: boolean } | undefined

      await act(async () => {
        loginResult = await result.current.login({
          domain: "test-domain",
          user: "testuser",
          password: "testpass",
        })
      })

      expect(loginResult?.success).toBe(true)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockSession.user)
      expect(result.current.expiresAt).toBeInstanceOf(Date)
      expect(mockCreateUserSession).toHaveBeenCalledWith({
        domainName: "test-domain",
        user: "testuser",
        password: "testpass",
      })
    })

    it("should return success false and set error on failed login", async () => {
      mockCreateUserSession.mockRejectedValue(new Error("Invalid credentials"))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      let loginResult: { success: boolean } | undefined

      await act(async () => {
        loginResult = await result.current.login({
          domain: "test-domain",
          user: "testuser",
          password: "wrongpass",
        })
      })

      expect(loginResult?.success).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.error).toBe("Invalid credentials")
    })

    it("should set loading state during login", async () => {
      let resolveLogin: (value: typeof mockSession) => void
      mockCreateUserSession.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLogin = resolve
          })
      )

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Start login
      let loginPromise: Promise<{ success: boolean }>
      act(() => {
        loginPromise = result.current.login({
          domain: "test-domain",
          user: "testuser",
          password: "testpass",
        })
      })

      // Should be loading
      expect(result.current.isLoading).toBe(true)

      // Resolve login
      await act(async () => {
        resolveLogin!(mockSession)
        await loginPromise
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe("Logout", () => {
    it("should clear user and call terminate session on logout", async () => {
      mockGetCurrentUserSession.mockResolvedValue(mockSession)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(mockTerminateUserSession).toHaveBeenCalledOnce()
    })

    it("should clear user even if terminate session fails", async () => {
      mockGetCurrentUserSession.mockResolvedValue(mockSession)
      mockTerminateUserSession.mockRejectedValue(new Error("Network error"))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true)
      })

      await act(async () => {
        await result.current.logout()
      })

      // Should still clear local state even if server call fails
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe("Edge Cases", () => {
    it("should handle rapid login/logout cycles", async () => {
      mockCreateUserSession.mockResolvedValue(mockSession)

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await result.current.login({
            domain: "test-domain",
            user: "testuser",
            password: "testpass",
          })
        })

        expect(result.current.isAuthenticated).toBe(true)

        await act(async () => {
          await result.current.logout()
        })

        expect(result.current.isAuthenticated).toBe(false)
      }
    })

    it("should handle non-Error rejection in login", async () => {
      mockCreateUserSession.mockRejectedValue("String error")

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.login({
          domain: "test-domain",
          user: "testuser",
          password: "testpass",
        })
      })

      expect(result.current.error).toContain("String error")
    })

    it("should handle non-Error rejection in session fetch", async () => {
      mockGetCurrentUserSession.mockRejectedValue("Connection refused")

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBe("Could not load current user session")
    })
  })
})
