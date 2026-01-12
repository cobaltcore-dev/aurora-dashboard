import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { AuthProvider, useAuth } from "./AuthProvider"
import type { User } from "./AuthProvider"
import { ReactNode } from "react"
import { router } from "../router"

// Mock router
vi.mock("../router", () => ({
  router: {
    invalidate: vi.fn(),
    navigate: vi.fn(),
  },
}))

// Extract the non-null user type
type AuthUser = NonNullable<User>

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // Mock window.location
    Object.defineProperty(window, "location", {
      value: {
        pathname: "/dashboard",
        search: "",
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
      expect(result.current.showInactivityModal).toBe(false)
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

    it("should clear logout reason on login", async () => {
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
        await result.current.logout("manual")
      })

      expect(result.current.logoutReason).toBe("manual")

      // Login again
      await act(async () => {
        await result.current.login(mockUser)
      })

      expect(result.current.logoutReason).toBeUndefined()
    })
  })

  describe("Logout", () => {
    it("should logout with manual reason and invalidate router", async () => {
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
        await result.current.logout("manual")
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.logoutReason).toBe("manual")
      expect(router.invalidate).toHaveBeenCalled()
    })

    it("should show modal on inactive logout", async () => {
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
        await result.current.logout("inactive")
      })

      expect(result.current.showInactivityModal).toBe(true)
      expect(result.current.logoutReason).toBe("inactive")
      expect(result.current.redirectAfterModal).toBe("/dashboard")
    })

    it("should show modal on expired logout", async () => {
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
        await result.current.logout("expired")
      })

      expect(result.current.showInactivityModal).toBe(true)
      expect(result.current.logoutReason).toBe("expired")
    })
  })

  describe("Inactivity Timer", () => {
    it("should logout user after 60 minutes of inactivity", async () => {
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

      // Fast-forward 60 minutes
      await act(async () => {
        vi.advanceTimersByTime(60 * 60 * 1000)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.logoutReason).toBe("inactive")
      expect(result.current.showInactivityModal).toBe(true)
    })

    it("should reset inactivity timer on user activity", async () => {
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

      // Advance 30 minutes
      await act(async () => {
        vi.advanceTimersByTime(30 * 60 * 1000)
      })

      // Simulate user activity
      await act(async () => {
        document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }))
      })

      // Advance another 30 minutes (total 60, but timer was reset)
      await act(async () => {
        vi.advanceTimersByTime(30 * 60 * 1000)
      })

      // Should still be authenticated (only 30 min since last activity)
      expect(result.current.isAuthenticated).toBe(true)

      // Advance full 60 minutes from last activity
      await act(async () => {
        vi.advanceTimersByTime(30 * 60 * 1000)
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.logoutReason).toBe("inactive")
    })

    it("should detect various activity events", async () => {
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

      const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"] as const

      for (const eventType of events) {
        // Advance 30 minutes
        await act(async () => {
          vi.advanceTimersByTime(30 * 60 * 1000)
        })

        // Trigger activity event
        await act(async () => {
          const event =
            eventType === "mousedown" || eventType === "click"
              ? new MouseEvent(eventType, { bubbles: true })
              : new Event(eventType, { bubbles: true })
          document.dispatchEvent(event)
        })

        // Should still be authenticated
        expect(result.current.isAuthenticated).toBe(true)
      }
    })

    it("should not start inactivity timer when not authenticated", async () => {
      const { result } = renderHook(() => useAuth(), { wrapper })

      // Don't login, just advance time
      await act(async () => {
        vi.advanceTimersByTime(60 * 60 * 1000)
      })

      // Should remain unauthenticated without any logout reason
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.logoutReason).toBeUndefined()
    })

    it("should clear inactivity timer on manual logout", async () => {
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

      // Advance partway through timeout
      await act(async () => {
        vi.advanceTimersByTime(30 * 60 * 1000)
      })

      // Manual logout
      await act(async () => {
        await result.current.logout("manual")
      })

      // Advance past what would have been the inactivity timeout
      await act(async () => {
        vi.advanceTimersByTime(60 * 60 * 1000)
      })

      // Should have logged out with manual reason, not inactive
      expect(result.current.logoutReason).toBe("manual")
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
      expect(result.current.logoutReason).toBe("expired")
      expect(result.current.showInactivityModal).toBe(true)
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
      expect(result.current.logoutReason).toBe("expired")
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

  describe("Inactivity Modal", () => {
    it("should close modal and navigate to login", async () => {
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
        await result.current.logout("inactive")
      })

      expect(result.current.showInactivityModal).toBe(true)

      act(() => {
        result.current.closeInactivityModal()
      })

      expect(result.current.showInactivityModal).toBe(false)
      expect(router.navigate).toHaveBeenCalledWith({
        to: "/auth/login",
        search: { redirect: "/dashboard" },
      })
    })

    it("should navigate without redirect if no path", async () => {
      Object.defineProperty(window, "location", {
        value: {
          pathname: "",
          search: "",
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
        await result.current.logout("inactive")
      })

      act(() => {
        result.current.closeInactivityModal()
      })

      expect(router.navigate).toHaveBeenCalledWith({
        to: "/auth/login",
        search: undefined,
      })
    })
  })

  describe("Edge Cases", () => {
    it("should handle default logout reason", async () => {
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

      expect(result.current.logoutReason).toBe("manual")
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
          await result.current.logout("manual")
        })

        expect(result.current.isAuthenticated).toBe(false)
      }
    })
  })
})
