import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { redirect, isNotFound } from "@tanstack/react-router"
import { ErrorBoundary } from "react-error-boundary"
import { getServiceIndex } from "@/server/Authentication/helpers"
import {
  guardStorageRoute,
  requireObjectStoreService,
  validateStorageAccess,
} from "../../-components/utils/serviceAvailability"
import { Route } from "./index"

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

/**
 * Asserts `fn` throws a TanStack Router `notFound()` and returns the caught error so
 * callers can assert the `reason` it carries (D10) — `caught.data`, not `caught`.
 */
function expectNotFound(fn: () => void): { data?: { reason?: string } } {
  try {
    fn()
  } catch (caught) {
    expect(isNotFound(caught)).toBe(true)
    return caught as { data?: { reason?: string } }
  }
  throw new Error("Expected function to throw a notFound()")
}

/** Async twin of `expectNotFound` — the route loader is async, so its throw arrives as a rejection. */
async function expectNotFoundAsync(promise: Promise<unknown>): Promise<{ data?: { reason?: string } }> {
  try {
    await promise
  } catch (caught) {
    expect(isNotFound(caught)).toBe(true)
    return caught as { data?: { reason?: string } }
  }
  throw new Error("Expected the loader to throw a notFound()")
}

describe("Storage Route - service availability guards", () => {
  const defaultParams = {
    projectId: "proj-1",
    provider: "swift",
    storageType: "containers",
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
        requireObjectStoreService(defaultServices, defaultParams)
      }).not.toThrow()

      expect(() => {
        validateStorageAccess(defaultServices, defaultParams)
      }).not.toThrow()
    })

    it("throws redirect when no object-store service is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        compute: {
          nova: true,
        },
      })

      expect(() => {
        requireObjectStoreService(defaultServices, defaultParams)
      }).toThrow("Redirect to: /projects/proj-1")
    })

    it("calls redirect with correct params when no storage services available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      try {
        requireObjectStoreService([], defaultParams)
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
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "swift" })
      }).not.toThrow()
    })

    it("throws notFound when swift is not available but provider is 'swift'", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          ceph: true,
        },
      })

      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "swift" })
      )
      expect(caught.data).toEqual({ reason: "provider-unavailable" })
      expect(redirect).not.toHaveBeenCalled()
    })

    it("throws notFound when ceph is in neither catalog type", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      // The removed Ceph availability fallback (D6) is gone — ceph is genuinely absent from this fixture,
      // so it must 404 rather than render a page whose every backend call fails.
      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "ceph", storageType: "buckets" })
      )
      expect(caught.data).toEqual({ reason: "provider-unavailable" })
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe("Edge Cases", () => {
    it("handles empty availableServices array", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      expect(() => {
        requireObjectStoreService([], defaultParams)
      }).toThrow()
    })

    it("calls redirect with correct params when swift is unavailable", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { ceph: true },
      })

      const params = {
        projectId: "test-proj",
        provider: "swift",
        storageType: "containers",
      }

      const caught = expectNotFound(() => validateStorageAccess(defaultServices, params))
      expect(caught.data).toEqual({ reason: "provider-unavailable" })
      expect(redirect).not.toHaveBeenCalled()
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
        validateStorageAccess(defaultServices, defaultParams)
      }).not.toThrow()
    })

    it("throws notFound when object-store exists but swift is missing", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          ceph: true,
        },
      })

      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "swift" })
      )
      expect(caught.data).toEqual({ reason: "provider-unavailable" })
      expect(redirect).not.toHaveBeenCalled()
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
        validateStorageAccess(defaultServices, { provider: "swift", storageType: "containers" })
      }).not.toThrow()
    })

    it("throws notFound when ceph is in neither catalog type (even without ceph in catalog)", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })

      // The removed Ceph availability fallback (D6) is gone — navigating to /ceph now 404s instead of
      // silently rendering a page whose every backend call fails.
      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { provider: "ceph", storageType: "buckets" })
      )
      expect(caught.data).toEqual({ reason: "provider-unavailable" })
      expect(redirect).not.toHaveBeenCalled()
    })

    it("redirects to project overview when no storage service is available", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      expect(() => {
        requireObjectStoreService([], { projectId: "proj-2" })
      }).toThrow("Redirect to: /projects/proj-2")
    })

    it("throws notFound when object-store exists but only ceph is available (swift requested)", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { ceph: true },
      })

      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { provider: "swift", storageType: "containers" })
      )
      expect(caught.data).toEqual({ reason: "provider-unavailable" })
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe("Invalid provider (issue #1081)", () => {
    it.each(["nope", "", "__proto__", "Swift"])("throws notFound with reason provider-not-found for %j", (provider) => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true, ceph: true },
      })

      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { ...defaultParams, provider, storageType: "containers" })
      )
      expect(caught.data).toEqual({ reason: "provider-not-found" })
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe("Canonical storageType enforcement (issue #1081)", () => {
    beforeEach(() => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
        "object-store-ceph": { ceph: true },
      })
    })

    it.each([
      ["swift", "buckets"],
      ["ceph", "containers"],
      ["swift", "objects"],
    ])("throws notFound with reason storage-type-mismatch for %s + %s", (provider, storageType) => {
      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { ...defaultParams, provider, storageType })
      )
      expect(caught.data).toEqual({ reason: "storage-type-mismatch" })
      expect(redirect).not.toHaveBeenCalled()
    })

    it("does not throw for the canonical swift + containers pair", () => {
      expect(() => {
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "swift", storageType: "containers" })
      }).not.toThrow()
      expect(redirect).not.toHaveBeenCalled()
    })

    it("does not throw for the canonical ceph + buckets pair", () => {
      expect(() => {
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "ceph", storageType: "buckets" })
      }).not.toThrow()
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe("Catalog lookup by service name (D6)", () => {
    it("does not throw when ceph is registered only as object-store-ceph (the case broken before D6)", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store-ceph": { ceph: true },
      })

      expect(() => {
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "ceph", storageType: "buckets" })
      }).not.toThrow()
    })

    it("does not throw when ceph is registered as object-store (either catalog type works)", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { ceph: true },
      })

      expect(() => {
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "ceph", storageType: "buckets" })
      }).not.toThrow()
    })

    it("throws notFound provider-unavailable for ceph when only swift is registered", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
      })

      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "ceph", storageType: "buckets" })
      )
      expect(caught.data).toEqual({ reason: "provider-unavailable" })
    })

    it("throws notFound provider-unavailable for swift when only object-store-ceph is registered, without redirecting", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store-ceph": { ceph: true },
      })

      const caught = expectNotFound(() => validateStorageAccess(defaultServices, defaultParams))
      expect(caught.data).toEqual({ reason: "provider-unavailable" })

      // An object store exists (ceph), just not swift — requireObjectStoreService must
      // not redirect here.
      expect(() => {
        requireObjectStoreService(defaultServices, defaultParams)
      }).not.toThrow()
      expect(redirect).not.toHaveBeenCalled()
    })

    it("redirects to project overview when the name appears only as a catalog type, not a service name", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        ceph: { rgw: true },
      })

      expect(() => {
        requireObjectStoreService(defaultServices, defaultParams)
      }).toThrow("Redirect to: /projects/proj-1")
    })
  })

  describe("guardStorageRoute — check ordering", () => {
    // The composer exists to own the order the two checks run in. Routes call only it, so
    // these are the tests that keep a future storage route from getting the order wrong.
    it("redirects (does not 404) when the project has no object storage AND the provider is invalid", () => {
      vi.mocked(getServiceIndex).mockReturnValue({})

      // Both checks would fire. The capability check runs first, so the user is sent
      // somewhere useful instead of being shown a 404 for a project that could never
      // serve this page in the first place.
      expect(() => {
        guardStorageRoute([], { projectId: "proj-1", provider: "nope", storageType: "nope" })
      }).toThrow("Redirect to: /projects/proj-1")
    })

    it("falls through to the address check when the project does have object storage", () => {
      vi.mocked(getServiceIndex).mockReturnValue({ "object-store": { swift: true } })

      const caught = expectNotFound(() =>
        guardStorageRoute(defaultServices, { projectId: "proj-1", provider: "swift", storageType: "buckets" })
      )
      expect(caught.data).toEqual({ reason: "storage-type-mismatch" })
      expect(redirect).not.toHaveBeenCalled()
    })

    it("does not throw on a canonical, available pairing", () => {
      vi.mocked(getServiceIndex).mockReturnValue({ "object-store": { swift: true } })

      expect(() => {
        guardStorageRoute(defaultServices, defaultParams)
      }).not.toThrow()
    })
  })

  describe("Route lifecycle ordering", () => {
    const makeContext = (queryResult: unknown) => ({
      trpcClient: {
        auth: {
          getAvailableServices: {
            query: vi.fn().mockResolvedValue(queryResult),
          },
        },
      },
    })

    // `loader` is typed as `RouteLoaderFn | RouteLoaderObject`; this route defines it as
    // a plain function, so cast the union away to call it directly in the test.
    const callLoader = (context: unknown, params: unknown) =>
      (Route.options.loader as (ctx: unknown) => Promise<unknown>)({ context, params })

    it("the loader queries getAvailableServices exactly once (D8 — no duplicate fetch)", async () => {
      vi.mocked(getServiceIndex).mockReturnValue({ "object-store": { swift: true } })
      const context = makeContext(defaultServices)

      await callLoader(context, defaultParams)

      expect(context.trpcClient.auth.getAvailableServices.query).toHaveBeenCalledTimes(1)
    })

    it("the redirect wins over notFound when provider and storageType are invalid too", async () => {
      // Both guards live in one loader; requireObjectStoreService runs first and
      // short-circuits, so "this project has no object storage at all" stays a redirect
      // to the overview instead of turning into a 404 for the bad provider.
      vi.mocked(getServiceIndex).mockReturnValue({})
      const context = makeContext([])

      await expect(callLoader(context, { projectId: "proj-1", provider: "nope", storageType: "nope" })).rejects.toThrow(
        "Redirect to: /projects/proj-1"
      )
    })

    it("tolerates an undefined query result", async () => {
      vi.mocked(getServiceIndex).mockReturnValue({})
      const context = makeContext(undefined)

      await expect(callLoader(context, defaultParams)).rejects.toThrow("Redirect to: /projects/proj-1")
    })

    it("reports a missing tRPC client instead of redirecting as if the project had no storage", async () => {
      // The line above is the catalog genuinely coming back empty; this is the client not
      // being there at all. Treating the second as the first would send the user to the
      // project overview and leave the wiring bug invisible.
      vi.mocked(getServiceIndex).mockReturnValue({})

      await expect(callLoader({ trpcClient: undefined }, defaultParams)).rejects.toThrow(
        "trpcClient is not available in route context"
      )
    })

    it("throws notFound for an invalid provider once the project does have object storage", async () => {
      vi.mocked(getServiceIndex).mockReturnValue({ "object-store": { swift: true } })
      const context = makeContext(defaultServices)

      const caught = await expectNotFoundAsync(
        callLoader(context, { projectId: "proj-1", provider: "nope", storageType: "containers" })
      )
      expect(caught.data).toEqual({ reason: "provider-not-found" })
    })
  })
})
