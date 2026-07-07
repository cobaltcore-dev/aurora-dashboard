import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "./AuthProvider"
import type { User } from "./AuthProvider"
import { ReactNode } from "react"

// Mock trpcClient
vi.mock("../trpcClient", () => ({
  trpcClient: {
    auth: {
      terminateUserSession: {
        mutate: vi.fn().mockResolvedValue(undefined),
      },
    },
  },
}))

// Mock router
const mockNavigate = vi.fn()
vi.mock("@tanstack/react-router", () => ({
  useRouter: () => ({
    navigate: mockNavigate,
  }),
}))

// Extract the non-null user type
type AuthUser = NonNullable<User>

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockNavigate.mockClear()

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/projects",
        search: "",
        href: "http://localhost/projects",
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Initialization", () => {
    it("should start with unauthenticated state", () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })

    it("should throw error when used outside provider", () => {
      expect(() => {
        renderHook(() => useAuth())
      }).toThrow("useAuth must be used within an AuthProvider")
    })
  })

  describe("Login", () => {
    it("should authenticate user on login", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const mockUser: AuthUser = {
        id: "1",
        name: "Test User",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser)
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockUser)
    })

    it("should set expiration date when provided", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
      const mockUser: AuthUser = {
        id: "1",
        name: "Test User",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser, expiresAt)
      })

      expect(result.current.expiresAt).toBeInstanceOf(Date)
    })

    it("should clear state on login", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const mockUser: AuthUser = {
        id: "1",
        name: "Test",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      // First login and logout
      await act(async () => {
        await result.current.login(mockUser)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)

      // Login again
      await act(async () => {
        await result.current.login(mockUser)
      })

      expect(result.current.isAuthenticated).toBe(true)
    })
  })

  describe("Logout", () => {
    it("should logout without redirect for manual logout", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const mockUser: AuthUser = {
        id: "1",
        name: "Test",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/", search: undefined })
    })

    it("should logout with redirect when preserveRedirect is true", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const mockUser: AuthUser = {
        id: "1",
        name: "Test",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser)
      })

      await act(async () => {
        await result.current.logout(true)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/",
        search: { redirect: "/projects" },
      })
    })
  })

  describe("Session Expiration", () => {
    it("should logout when token expires", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const expiresAt = new Date(Date.now() + 5000).toISOString() // 5 seconds
      const mockUser: AuthUser = {
        id: "1",
        name: "Test User",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser, expiresAt)
      })

      expect(result.current.isAuthenticated).toBe(true)

      // Fast-forward to expiration
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.isAuthenticated).toBe(false)
    })

    it("should logout immediately if token is already expired", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const expiredDate = new Date(Date.now() - 1000).toISOString()
      const mockUser: AuthUser = {
        id: "1",
        name: "Test User",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser, expiredDate)
      })

      expect(result.current.isAuthenticated).toBe(false)
    })

    it("should clear logout timer on new login", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const firstExpiry = new Date(Date.now() + 10000).toISOString()
      const mockUser1: AuthUser = {
        id: "1",
        name: "Test User",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser1, firstExpiry)
      })

      // Login again with new expiry
      const secondExpiry = new Date(Date.now() + 20000).toISOString()
      const mockUser2: AuthUser = {
        id: "2",
        name: "Test User 2",
        domain: { id: "456", name: "Test Domain 2" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser2, secondExpiry)
      })

      // Advance past first expiry
      await act(async () => {
        vi.advanceTimersByTime(10000)
      })

      // Should still be authenticated (second timer is active)
      expect(result.current.isAuthenticated).toBe(true)

      // Advance to second expiry
      await act(async () => {
        vi.advanceTimersByTime(10000)
      })

      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe("Redirect Handling", () => {
    it("should preserve query params in redirect when requested", async () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "/projects",
          search: "?search=myproject",
          href: "http://localhost/projects?search=myproject",
        },
        writable: true,
        configurable: true,
      })

      const { result } = renderHook(() => useAuth(), { wrapper })

      const mockUser: AuthUser = {
        id: "1",
        name: "Test",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser)
      })

      await act(async () => {
        await result.current.logout(true)
      })

      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/",
        search: { redirect: "/projects?search=myproject" },
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle logout without parameters", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      const mockUser: AuthUser = {
        id: "1",
        name: "Test",
        domain: { id: "123", name: "Test Domain" },
        password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      }

      await act(async () => {
        await result.current.login(mockUser)
      })

      await act(async () => {
        await result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
    })

    it("should handle rapid login/logout cycles", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      for (let i = 0; i < 5; i++) {
        const mockUser: AuthUser = {
          id: String(i),
          name: `User ${i}`,
          domain: { id: `${i}00`, name: `Domain ${i}` },
          password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        }

        await act(async () => {
          await result.current.login(mockUser)
        })

        expect(result.current.isAuthenticated).toBe(true)

        await act(async () => {
          await result.current.logout()
        })

        expect(result.current.isAuthenticated).toBe(false)
      }
    })
  })
})
