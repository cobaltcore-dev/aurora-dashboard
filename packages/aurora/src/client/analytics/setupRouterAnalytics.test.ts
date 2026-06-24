import { describe, it, expect, vi, beforeEach } from "vitest"
import { setupRouterAnalytics } from "./setupRouterAnalytics"

describe("setupRouterAnalytics", () => {
  const createMockRouter = (options: {
    onTrackEvent?: ReturnType<typeof vi.fn>
    matches?: Array<{ routeId: string; staticData?: Record<string, unknown> }>
    pathname?: string
    search?: string
  }) => {
    const subscribers: Array<() => void> = []

    return {
      subscribe: vi.fn((event: string, callback: () => void) => {
        if (event === "onResolved") {
          subscribers.push(callback)
        }
        // Return unsubscribe function
        return () => {
          const index = subscribers.indexOf(callback)
          if (index > -1) subscribers.splice(index, 1)
        }
      }),
      options: {
        context: {
          onTrackEvent: options.onTrackEvent,
        },
      },
      state: {
        matches: options.matches ?? [],
        location: {
          pathname: options.pathname ?? "/",
          searchStr: options.search ?? "",
        },
      },
      // Helper to trigger the onResolved event
      _triggerOnResolved: () => {
        subscribers.forEach((cb) => cb())
      },
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should subscribe to onResolved event", () => {
    const mockRouter = createMockRouter({})

    setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])

    expect(mockRouter.subscribe).toHaveBeenCalledWith("onResolved", expect.any(Function))
  })

  it("should return unsubscribe function", () => {
    const mockRouter = createMockRouter({})

    const unsubscribe = setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])

    expect(typeof unsubscribe).toBe("function")
  })

  it("should not call onTrackEvent when there are no matches", () => {
    const onTrackEvent = vi.fn()
    const mockRouter = createMockRouter({
      onTrackEvent,
      matches: [],
      pathname: "/",
    })

    setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])
    mockRouter._triggerOnResolved()

    expect(onTrackEvent).not.toHaveBeenCalled()
  })

  it("should call onTrackEvent with routeId as action and pathname in metadata", () => {
    const onTrackEvent = vi.fn()
    const mockRouter = createMockRouter({
      onTrackEvent,
      matches: [{ routeId: "/_auth/projects" }],
      pathname: "/projects",
    })

    setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])
    mockRouter._triggerOnResolved()

    expect(onTrackEvent).toHaveBeenCalledWith({
      source: "router",
      action: "/_auth/projects",
      metadata: {
        pathname: "/projects",
      },
    })
  })

  it("should include section and service in metadata when available in staticData", () => {
    const onTrackEvent = vi.fn()
    const mockRouter = createMockRouter({
      onTrackEvent,
      matches: [
        {
          routeId: "/_auth/projects/$projectId/compute/images",
          staticData: {
            section: "compute",
            service: "images",
          },
        },
      ],
      pathname: "/projects/abc-123/compute/images",
    })

    setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])
    mockRouter._triggerOnResolved()

    expect(onTrackEvent).toHaveBeenCalledWith({
      source: "router",
      action: "/_auth/projects/$projectId/compute/images",
      metadata: {
        pathname: "/projects/abc-123/compute/images",
        section: "compute",
        service: "images",
      },
    })
  })

  it("should use the deepest match when multiple matches exist", () => {
    const onTrackEvent = vi.fn()
    const mockRouter = createMockRouter({
      onTrackEvent,
      matches: [
        { routeId: "__root__" },
        { routeId: "/_auth" },
        { routeId: "/_auth/projects" },
        {
          routeId: "/_auth/projects/$projectId/compute/flavors",
          staticData: {
            section: "compute",
            service: "flavors",
          },
        },
      ],
      pathname: "/projects/abc-123/compute/flavors",
    })

    setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])
    mockRouter._triggerOnResolved()

    expect(onTrackEvent).toHaveBeenCalledWith({
      source: "router",
      action: "/_auth/projects/$projectId/compute/flavors",
      metadata: {
        pathname: "/projects/abc-123/compute/flavors",
        section: "compute",
        service: "flavors",
      },
    })
  })

  it("should only include section in metadata if service is not defined", () => {
    const onTrackEvent = vi.fn()
    const mockRouter = createMockRouter({
      onTrackEvent,
      matches: [
        {
          routeId: "/_auth/projects/$projectId/network",
          staticData: {
            section: "network",
            // service is undefined
          },
        },
      ],
      pathname: "/projects/abc-123/network",
    })

    setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])
    mockRouter._triggerOnResolved()

    expect(onTrackEvent).toHaveBeenCalledWith({
      source: "router",
      action: "/_auth/projects/$projectId/network",
      metadata: {
        pathname: "/projects/abc-123/network",
        section: "network",
      },
    })
  })

  it("should include search params in metadata when present", () => {
    const onTrackEvent = vi.fn()
    const mockRouter = createMockRouter({
      onTrackEvent,
      matches: [
        {
          routeId: "/_auth/projects/$projectId/compute/images",
          staticData: {
            section: "compute",
            service: "images",
          },
        },
      ],
      pathname: "/projects/abc-123/compute/images",
      search: "?memberStatus=accepted",
    })

    setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])
    mockRouter._triggerOnResolved()

    expect(onTrackEvent).toHaveBeenCalledWith({
      source: "router",
      action: "/_auth/projects/$projectId/compute/images",
      metadata: {
        pathname: "/projects/abc-123/compute/images",
        search: "?memberStatus=accepted",
        section: "compute",
        service: "images",
      },
    })
  })

  it("should handle unsubscribe correctly", () => {
    const onTrackEvent = vi.fn()
    const mockRouter = createMockRouter({
      onTrackEvent,
      matches: [{ routeId: "/_auth/projects" }],
      pathname: "/projects",
    })

    const unsubscribe = setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])

    // Trigger once before unsubscribe
    mockRouter._triggerOnResolved()
    expect(onTrackEvent).toHaveBeenCalledTimes(1)

    // Unsubscribe
    unsubscribe()

    // Trigger again after unsubscribe
    mockRouter._triggerOnResolved()
    expect(onTrackEvent).toHaveBeenCalledTimes(1) // Should still be 1
  })

  it("should catch and log errors thrown by onTrackEvent callback", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const error = new Error("Analytics service unavailable")
    const onTrackEvent = vi.fn(() => {
      throw error
    })
    const mockRouter = createMockRouter({
      onTrackEvent,
      matches: [{ routeId: "/_auth/projects" }],
      pathname: "/projects",
    })

    setupRouterAnalytics(mockRouter as unknown as Parameters<typeof setupRouterAnalytics>[0])

    // Should not throw
    expect(() => mockRouter._triggerOnResolved()).not.toThrow()

    expect(onTrackEvent).toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith("onTrackEvent callback threw:", error)

    consoleErrorSpy.mockRestore()
  })
})
