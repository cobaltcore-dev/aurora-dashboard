import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render } from "@testing-library/react"
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from "@tanstack/react-router"
import { UserNavigationTracker } from "./UserNavigationTracker"
import type { OnUserNavigationCallback, UserNavigationMetrics } from "../AuroraApp"

describe("UserNavigationTracker", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  const createTestRouter = (onUserNavigation?: OnUserNavigationCallback) => {
    const memoryHistory = createMemoryHistory({
      initialEntries: ["/"],
    })

    const rootRoute = createRootRoute({
      component: () => <UserNavigationTracker onUserNavigation={onUserNavigation} />,
    })

    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
      staticData: {
        section: "home",
        service: "dashboard",
      },
      component: () => null,
    })

    const computeRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/compute",
      staticData: {
        section: "compute",
        service: "instances",
      },
      component: () => null,
    })

    const incompleteRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/network",
      staticData: {
        section: "network",
        // Missing service field
      },
      component: () => null,
    })

    const routeTree = rootRoute.addChildren([indexRoute, computeRoute, incompleteRoute])

    const router = createRouter({
      routeTree,
      history: memoryHistory,
    })

    return router
  }

  it("should call onUserNavigation with correct metrics on route change", async () => {
    const mockCallback = vi.fn()
    const router = createTestRouter(mockCallback)

    render(<RouterProvider router={router} />)

    // Initial route - run timers to trigger callback
    await vi.runAllTimersAsync()

    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "router",
        action: "home_dashboard",
        metadata: expect.objectContaining({
          pathname: "/",
          section: "home",
          service: "dashboard",
        }),
      })
    )

    // Navigate to compute route
    mockCallback.mockClear()
    router.history.push("/compute")
    await vi.runAllTimersAsync()

    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "router",
        action: "compute_instances",
        metadata: expect.objectContaining({
          pathname: "/compute",
          section: "compute",
          service: "instances",
        }),
      })
    )
  })

  it("should debounce rapid navigation", async () => {
    const mockCallback = vi.fn()
    const router = createTestRouter(mockCallback)

    render(<RouterProvider router={router} />)

    // Navigate rapidly without running timers
    router.history.push("/compute")
    router.history.push("/")
    router.history.push("/compute")

    // Only the last navigation should be tracked
    await vi.runAllTimersAsync()

    expect(mockCallback).toHaveBeenCalledTimes(1)
    expect(mockCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "router",
        action: "compute_instances",
        metadata: expect.objectContaining({
          pathname: "/compute",
        }),
      })
    )
  })

  it("should not track routes without complete section/service metadata", async () => {
    const mockCallback = vi.fn()
    const router = createTestRouter(mockCallback)

    render(<RouterProvider router={router} />)

    // Clear initial call
    await vi.runAllTimersAsync()
    mockCallback.mockClear()

    // Navigate to incomplete route
    router.history.push("/network")
    await vi.runAllTimersAsync()

    // Callback should not be invoked
    expect(mockCallback).not.toHaveBeenCalled()
  })

  it("should catch and log errors in callback without breaking the app", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const mockCallback = vi.fn(() => {
      throw new Error("Analytics service unavailable")
    })
    const router = createTestRouter(mockCallback)

    render(<RouterProvider router={router} />)

    await vi.runAllTimersAsync()

    expect(mockCallback).toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[Aurora Analytics] Error in onUserNavigation callback:",
      expect.any(Error)
    )
  })

  it("should not call callback when onUserNavigation is undefined", async () => {
    const router = createTestRouter(undefined)

    // Should not throw
    expect(() => {
      render(<RouterProvider router={router} />)
    }).not.toThrow()

    await vi.runAllTimersAsync()
  })

  it("should cleanup timeout on unmount", async () => {
    const mockCallback = vi.fn()
    const router = createTestRouter(mockCallback)

    const { unmount } = render(<RouterProvider router={router} />)

    // Don't run timers yet
    unmount()

    // Run timers after unmount
    await vi.runAllTimersAsync()

    // Callback should not be called after unmount
    expect(mockCallback).not.toHaveBeenCalled()
  })

  it("should include routeId in metadata", async () => {
    const mockCallback = vi.fn()
    const router = createTestRouter(mockCallback)

    render(<RouterProvider router={router} />)

    await vi.runAllTimersAsync()

    const call = mockCallback.mock.calls[0][0] as UserNavigationMetrics
    expect(call.source).toBe("router")
    expect(call.metadata).toHaveProperty("routeId")
    expect(typeof call.metadata?.routeId).toBe("string")
  })
})
