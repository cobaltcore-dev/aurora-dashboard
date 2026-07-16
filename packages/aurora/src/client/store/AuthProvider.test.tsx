import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider, useAuth } from "./AuthProvider"
import { ReactNode } from "react"
import { trpcReact } from "../trpcClient"

// Mock trpcReact
vi.mock("../trpcClient", () => ({
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
    useUtils: vi.fn(() => ({
      auth: {
        getCurrentUserSession: {
          setData: vi.fn(),
        },
      },
    })),
  },
}))

const mockUseQuery = trpcReact.auth.getCurrentUserSession.useQuery as ReturnType<typeof vi.fn>
const mockUseLoginMutation = trpcReact.auth.createUserSession.useMutation as ReturnType<typeof vi.fn>
const mockUseLogoutMutation = trpcReact.auth.terminateUserSession.useMutation as ReturnType<typeof vi.fn>

const mockSession = {
  user: {
    id: "1",
    name: "Test User",
    domain: { id: "123", name: "Test Domain" },
    password_expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
}

// Helper to create mock query result
const createMockQueryResult = (overrides: {
  data?: typeof mockSession | null
  isLoading?: boolean
  isRefetching?: boolean
  error?: Error | null
  refetch?: () => Promise<unknown>
}) => ({
  data: overrides.data ?? null,
  isLoading: overrides.isLoading ?? false,
  isRefetching: overrides.isRefetching ?? false,
  error: overrides.error ?? null,
  refetch: overrides.refetch ?? vi.fn().mockResolvedValue({}),
})

// Helper to create mock mutation result
const createMockMutationResult = (overrides: {
  mutateAsync?: () => Promise<unknown>
  isPending?: boolean
  error?: Error | null
}) => ({
  mutateAsync: overrides.mutateAsync ?? vi.fn().mockResolvedValue({}),
  isPending: overrides.isPending ?? false,
  error: overrides.error ?? null,
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
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mocks: no session, not loading
    mockUseQuery.mockReturnValue(createMockQueryResult({ data: null, isLoading: false }))
    mockUseLoginMutation.mockReturnValue(createMockMutationResult({}))
    mockUseLogoutMutation.mockReturnValue(createMockMutationResult({}))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("Initialization", () => {
    it("should start with loading state while fetching session", () => {
      mockUseQuery.mockReturnValue(createMockQueryResult({ isLoading: true }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.isAuthenticated).toBe(false)
    })

    it("should be unauthenticated when no session exists", () => {
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: null, isLoading: false }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })

    it("should restore session if one exists", () => {
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: mockSession, isLoading: false }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(mockSession.user)
      expect(result.current.expiresAt).toBeInstanceOf(Date)
    })

    it("should set error if session fetch fails", () => {
      mockUseQuery.mockReturnValue(
        createMockQueryResult({
          data: null,
          isLoading: false,
          error: new Error("Network error"),
        })
      )

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(false)
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
      // Initially no session
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: null }))

      const mutateAsyncMock = vi.fn().mockResolvedValue(mockSession)
      mockUseLoginMutation.mockReturnValue(createMockMutationResult({ mutateAsync: mutateAsyncMock }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      let loginResult: { success: boolean } | undefined

      await act(async () => {
        loginResult = await result.current.login({
          domain: "test-domain",
          user: "testuser",
          password: "testpass",
        })
      })

      expect(loginResult?.success).toBe(true)
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        domainName: "test-domain",
        user: "testuser",
        password: "testpass",
      })
    })

    it("should return success false on failed login", async () => {
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: null }))

      const mutateAsyncMock = vi.fn().mockRejectedValue(new Error("Invalid credentials"))
      mockUseLoginMutation.mockReturnValue(createMockMutationResult({ mutateAsync: mutateAsyncMock }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      let loginResult: { success: boolean } | undefined

      await act(async () => {
        loginResult = await result.current.login({
          domain: "test-domain",
          user: "testuser",
          password: "wrongpass",
        })
      })

      expect(loginResult?.success).toBe(false)
    })

    it("should show loading state during login", () => {
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: null }))
      mockUseLoginMutation.mockReturnValue(createMockMutationResult({ isPending: true }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      expect(result.current.isLoading).toBe(true)
    })

    it("should show login mutation error", () => {
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: null }))
      mockUseLoginMutation.mockReturnValue(
        createMockMutationResult({
          error: new Error("Invalid credentials"),
        })
      )

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      expect(result.current.error).toBe("Invalid credentials")
    })
  })

  describe("Logout", () => {
    it("should call terminate session on logout", async () => {
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: mockSession }))

      const mutateAsyncMock = vi.fn().mockResolvedValue(undefined)
      mockUseLogoutMutation.mockReturnValue(createMockMutationResult({ mutateAsync: mutateAsyncMock }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      await act(async () => {
        await result.current.logout()
      })

      expect(mutateAsyncMock).toHaveBeenCalledOnce()
    })

    it("should handle logout error gracefully", async () => {
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: mockSession }))

      const mutateAsyncMock = vi.fn().mockRejectedValue(new Error("Network error"))
      mockUseLogoutMutation.mockReturnValue(createMockMutationResult({ mutateAsync: mutateAsyncMock }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      // Should not throw even if terminate fails
      await act(async () => {
        await result.current.logout()
      })

      expect(mutateAsyncMock).toHaveBeenCalledOnce()
    })
  })

  describe("Session Expiration", () => {
    it("should auto-logout when session expires", async () => {
      vi.useFakeTimers()

      const shortExpiresAt = new Date(Date.now() + 5000).toISOString() // 5 seconds
      const shortSession = { ...mockSession, expires_at: shortExpiresAt }

      mockUseQuery.mockReturnValue(createMockQueryResult({ data: shortSession }))
      mockUseLoginMutation.mockReturnValue(createMockMutationResult({}))
      mockUseLogoutMutation.mockReturnValue(createMockMutationResult({}))

      const mockSetData = vi.fn()
      const mockUseUtils = trpcReact.useUtils as ReturnType<typeof vi.fn>
      mockUseUtils.mockReturnValue({
        auth: {
          getCurrentUserSession: {
            setData: mockSetData,
          },
        },
      })

      // Mock window.location for redirect check
      const originalLocation = window.location
      // @ts-expect-error - mocking window.location
      delete window.location
      // @ts-expect-error - mocking window.location
      window.location = { ...originalLocation, pathname: "/dashboard", href: "" }

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual(shortSession.user)

      // Advance time past expiration
      await act(async () => {
        vi.advanceTimersByTime(5000)
      })

      // Should trigger redirect with return URL since not on "/"
      expect(window.location.href).toContain("?redirect=")

      // Restore
      // @ts-expect-error - restoring window.location
      window.location = originalLocation
    })

    it("should clear session immediately if already expired", async () => {
      vi.useFakeTimers()

      const expiredAt = new Date(Date.now() - 1000).toISOString() // Already expired
      const expiredSession = { ...mockSession, expires_at: expiredAt }

      mockUseQuery.mockReturnValue(createMockQueryResult({ data: expiredSession }))
      mockUseLoginMutation.mockReturnValue(createMockMutationResult({}))
      mockUseLogoutMutation.mockReturnValue(createMockMutationResult({}))

      const mockSetData = vi.fn()
      const mockUseUtils = trpcReact.useUtils as ReturnType<typeof vi.fn>
      mockUseUtils.mockReturnValue({
        auth: {
          getCurrentUserSession: {
            setData: mockSetData,
          },
        },
      })

      // Mock window.location - already on "/"
      const originalLocation = window.location
      // @ts-expect-error - mocking window.location
      delete window.location
      // @ts-expect-error - mocking window.location
      window.location = { ...originalLocation, pathname: "/", href: "" }

      renderHook(() => useAuth(), { wrapper: createWrapper() })

      // Should clear session cache immediately since already on "/"
      await vi.waitFor(() => {
        expect(mockSetData).toHaveBeenCalledWith(undefined, undefined)
      })

      // Restore
      // @ts-expect-error - restoring window.location
      window.location = originalLocation
    })
  })

  describe("Edge Cases", () => {
    it("should handle null user in session data", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseQuery.mockReturnValue(createMockQueryResult({ data: { user: null, expires_at: null } as any }))

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })
})
