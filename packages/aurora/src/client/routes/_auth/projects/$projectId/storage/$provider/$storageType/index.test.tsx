import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { redirect } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { checkServiceAvailability } from "./index"

// Mock the dependencies
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    redirect: vi.fn((args) => {
      if (args.href) {
        throw new Error(`Redirect to: ${args.href}`)
      }
      // Interpolate named params into the `to` string so assertions can use resolved paths
      let resolvedPath: string = args.to
      if (args.params) {
        for (const [key, value] of Object.entries(args.params as Record<string, string>)) {
          resolvedPath = resolvedPath.replace(`$${key}`, value ?? "")
        }
      }
      throw new Error(`Redirect to: ${resolvedPath}`)
    }),
  }
})

vi.mock("@/server/Authentication/helpers", () => ({
  getServiceIndex: vi.fn(),
}))

describe("Storage Route - checkServiceAvailability", () => {
  const defaultParams = {
    projectId: "proj-1",
    provider: "swift",
  }

  const defaultServices = [
    { type: "object-store", name: "swift" },
    { type: "compute", name: "nova" },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Service Availability Checks", () => {
    it("does not throw when object-store service is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, defaultParams)
      }).not.toThrow()
    })

    it("throws redirect when no object-store service is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        compute: {
          nova: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, defaultParams)
      }).toThrow("Redirect to: /projects/proj-1")
    })

    it("calls redirect with correct params when no storage services available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      try {
        checkServiceAvailability([], defaultParams)
      } catch {
        // Expected to throw
      }

      expect(redirect).toHaveBeenCalledWith({
        to: "/projects/$projectId",
        params: { projectId: "proj-1" },
      })
    })
  })

  describe("Object Storage Specific Checks", () => {
    it("does not throw when swift service is available and provider is 'swift'", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "swift" })
      }).not.toThrow()
    })

    it("throws redirect when swift is not available but provider is 'swift'", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          ceph: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/buckets")
    })

    it("does not throw when ceph is not in catalog but cephFallbackEnabled is true", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      // cephFallbackEnabled is hardcoded to true, so Ceph is always available
      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "ceph" })
      }).not.toThrow()
    })
  })

  describe("Edge Cases", () => {
    it("handles empty availableServices array", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      expect(() => {
        checkServiceAvailability([], defaultParams)
      }).toThrow()
    })

    it("calls redirect with correct params when swift is unavailable", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { ceph: true },
      })

      const params = {
        projectId: "test-proj",
        provider: "swift",
      }

      try {
        checkServiceAvailability(defaultServices, params)
      } catch {
        // Expected
      }

      // The implementation spreads `params` and overrides `provider`,
      // so the call receives exactly { projectId, provider: "ceph" }.
      expect(redirect).toHaveBeenCalledWith({
        to: "/projects/$projectId/storage/$provider/$storageType",
        params: { projectId: "test-proj", provider: "ceph", storageType: "buckets" },
      })
    })
  })

  describe("Multiple Storage Services", () => {
    it("accepts when multiple object-store services exist including swift", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
          ceph: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, defaultParams)
      }).not.toThrow()
    })

    it("redirects to ceph when object-store exists but swift is missing", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          ceph: true,
        },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { ...defaultParams, provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-1/storage/ceph/buckets")
    })
  })

  // ─── ErrorBoundary reset regression (bug #875) ──────────────────────────────
  //
  // Before the fix, the ErrorBoundary wrapping SwiftContainers/CephContainers had
  // no `resetKeys`. Once the boundary caught a render error it stayed in the error
  // state indefinitely: navigating to a different project or provider did NOT reset
  // the boundary, so every subsequent navigation attempt still showed the error
  // fallback — effectively freezing all page navigation until a hard reload.
  //
  // The fix adds `resetKeys={[project, provider]}` to the ErrorBoundary.  The
  // test below verifies this at the component level: it mounts an ErrorBoundary
  // with the same `resetKeys` pattern, forces a child to throw on the first render,
  // asserts the fallback appears, then rerenders with updated resetKeys and asserts
  // that the boundary resets and the child renders successfully on the second pass.
  // ─────────────────────────────────────────────────────────────────────────────
  // ─── ErrorBoundary reset regression (bug #875) ──────────────────────────────
  //
  // react-error-boundary's componentDidUpdate resets when resetKeys change
  // (previous keys !== next keys via Object.is comparison per-element).
  // But crucially the reset only triggers when didCatch===true AND the prev error
  // is non-null. The child component that throws must render again after the reset
  // is triggered so the boundary can re-enter the "healthy" state.
  //
  // The test wraps an ErrorBoundary with `resetKeys` identical to the page (
  // [project, provider]), makes a child throw, asserts the fallback UI appears,
  // then rerenders with a changed key and asserts the fallback disappears and
  // the healthy child content is visible — proving the boundary reset fired.
  // ─────────────────────────────────────────────────────────────────────────────
  describe("ErrorBoundary reset behavior (bug #875 — component-level regression)", () => {
    it("resets the ErrorBoundary when the provider key changes after a render error", () => {
      // The ErrorBoundary resets only when didCatch===true AND resetKeys change.
      // React-error-boundary calls componentDidUpdate to check this.
      // The child must NOT throw on the second mount (after reset) so the boundary
      // can re-enter its healthy render path.
      let throwOnMount = true

      const MaybeThrow = ({ label }: { label: string }) => {
        if (throwOnMount) {
          throw new Error("simulated render error")
        }
        return <div data-testid="healthy-content">{label}</div>
      }

      const FALLBACK_TEXT = "Error loading component"
      const FallbackUI = () => <div>{FALLBACK_TEXT}</div>

      const origConsoleError = console.error
      console.error = () => {}

      try {
        // First render: child throws → boundary enters error state.
        const { rerender } = render(
          <ErrorBoundary resetKeys={["proj-1", "swift"]} FallbackComponent={FallbackUI}>
            <MaybeThrow label="swift content" />
          </ErrorBoundary>
        )
        expect(screen.getByText(FALLBACK_TEXT)).toBeTruthy()
        expect(screen.queryByTestId("healthy-content")).toBeNull()

        // Disable throwing so the next render attempt succeeds.
        throwOnMount = false

        // Rerender with changed provider key → boundary resets.
        rerender(
          <ErrorBoundary resetKeys={["proj-1", "ceph"]} FallbackComponent={FallbackUI}>
            <MaybeThrow label="ceph content" />
          </ErrorBoundary>
        )

        // Fallback must be gone; healthy child must be visible.
        expect(screen.queryByText(FALLBACK_TEXT)).toBeNull()
        expect(screen.getByTestId("healthy-content")).toBeTruthy()
        expect(screen.getByText("ceph content")).toBeTruthy()
      } finally {
        console.error = origConsoleError
      }
    })

    it("resets the ErrorBoundary when the project key changes after a render error", () => {
      let throwOnMount = true

      const MaybeThrow = ({ label }: { label: string }) => {
        if (throwOnMount) {
          throw new Error("simulated render error")
        }
        return <div data-testid="healthy-project-content">{label}</div>
      }

      const FALLBACK_TEXT = "Error loading component"
      const FallbackUI = () => <div>{FALLBACK_TEXT}</div>

      const origConsoleError = console.error
      console.error = () => {}

      try {
        const { rerender } = render(
          <ErrorBoundary resetKeys={["proj-A", "swift"]} FallbackComponent={FallbackUI}>
            <MaybeThrow label="project A content" />
          </ErrorBoundary>
        )
        expect(screen.getByText(FALLBACK_TEXT)).toBeTruthy()
        expect(screen.queryByTestId("healthy-project-content")).toBeNull()

        throwOnMount = false

        rerender(
          <ErrorBoundary resetKeys={["proj-B", "swift"]} FallbackComponent={FallbackUI}>
            <MaybeThrow label="project B content" />
          </ErrorBoundary>
        )

        expect(screen.queryByText(FALLBACK_TEXT)).toBeNull()
        expect(screen.getByTestId("healthy-project-content")).toBeTruthy()
        expect(screen.getByText("project B content")).toBeTruthy()
      } finally {
        console.error = origConsoleError
      }
    })
  })

  describe("Provider switching (bug #875 — error disables navigation)", () => {
    it("does not throw when provider is swift and swift is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { projectId: "proj-1", provider: "swift" })
      }).not.toThrow()
    })

    it("does not throw when provider is ceph and cephFallbackEnabled is true (even without ceph in catalog)", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })

      // cephFallbackEnabled is true, so navigating to /ceph should work even without Ceph in catalog
      expect(() => {
        checkServiceAvailability(defaultServices, { projectId: "proj-1", provider: "ceph" })
      }).not.toThrow()
    })

    it("redirects to project overview when no storage service is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      expect(() => {
        checkServiceAvailability([], { projectId: "proj-2", provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-2")
    })

    it("redirects swift provider to ceph when only ceph is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { ceph: true },
      })

      expect(() => {
        checkServiceAvailability(defaultServices, { projectId: "proj-3", provider: "swift" })
      }).toThrow("Redirect to: /projects/proj-3/storage/ceph/buckets")
    })
  })
})
