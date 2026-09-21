import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { redirect, isNotFound, useParams } from "@tanstack/react-router"
import { TRPCClientError } from "@trpc/client"
import { getServiceIndex } from "@/server/Authentication/helpers"
import { requireObjectStoreService, validateStorageAccess } from "../../../../-components/utils/serviceAvailability"
import { CONTAINER_NOT_FOUND } from "../../../../-components/utils/containerExistence"
import { ObjectsDashboard, Route } from "./index"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages as enMessages } from "@/locales/en/messages"

// Initialize i18n
i18n.load("en", enMessages)
i18n.activate("en")

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
    useParams: vi.fn(),
  }
})

vi.mock("@/server/Authentication/helpers", () => ({
  getServiceIndex: vi.fn(),
}))

// Mock the content components to return simple test IDs
vi.mock("../../../../-components/Swift/Objects", () => ({
  SwiftObjects: () => <div data-testid="swift-objects">Swift Objects</div>,
}))

vi.mock("../../../../-components/Ceph/Objects", () => ({
  CephObjects: () => <div data-testid="ceph-objects">Ceph Objects</div>,
}))

vi.mock("../../../../-components/Ceph/Buckets", () => ({
  CephCorsRules: () => <div data-testid="ceph-cors-rules">CORS Rules</div>,
  CephLifecycleRules: () => <div data-testid="ceph-lifecycle-rules">Lifecycle Rules</div>,
}))

vi.mock("../../../../-components/Ceph/Buckets/BucketHeader", () => ({
  BucketHeader: () => null,
}))

vi.mock("../../../../-components/Swift/Containers/ContainerHeader", () => ({
  ContainerHeader: () => <div data-testid="swift-container-header" />,
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

describe("Objects Route - service availability guards", () => {
  const defaultParams = {
    projectId: "proj-1",
    provider: "swift",
    storageType: "containers",
    containerName: "my-container",
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

    it("throws notFound with correct reason when swift is unavailable", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { ceph: true },
      })

      const params = {
        projectId: "test-proj",
        provider: "swift",
        storageType: "containers",
        containerName: "test-container",
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

    it("throws notFound when ceph is in neither catalog type (Multiple Storage Services variant)", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {
          swift: true,
        },
      })

      // The removed Ceph availability fallback (D6) is gone.
      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "ceph", storageType: "buckets" })
      )
      expect(caught.data).toEqual({ reason: "provider-unavailable" })
      expect(redirect).not.toHaveBeenCalled()
    })

    it("redirects to project overview when no object-store service is available at all", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": {},
      })

      // Under D6 the gate is `hasSwift || hasCeph` by name — both false here, since an
      // empty `object-store` object has no `swift`/`ceph` keys. requireObjectStoreService
      // redirects to the project overview, NOT to ceph/buckets (that was the old,
      // now-removed Ceph availability fallback (D6)), and NOT a notFound.
      expect(() => {
        requireObjectStoreService(defaultServices, { projectId: defaultParams.projectId })
      }).toThrow("Redirect to: /projects/proj-1")
    })
  })

  describe("Canonical storageType enforcement", () => {
    // Ceph is available here because it is registered in the catalog (object-store-ceph),
    // not because of the now-removed fallback flag (D6). This lets both providers
    // pass availability so the canonical check is what's exercised. This route behaves
    // exactly like the list route: a non-canonical storageType is a wrong address and
    // 404s. It used to redirect to the canonical path (the old D3 asymmetry) because it
    // has a concrete containerName to land on — dropped, since the app never generated
    // a non-canonical objects URL for that redirect to normalize.
    beforeEach(() => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
        "object-store-ceph": { ceph: true },
      })
    })

    it("throws notFound for swift + buckets instead of redirecting to the canonical path", () => {
      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, {
          ...defaultParams,
          provider: "swift",
          storageType: "buckets",
        })
      )
      expect(caught.data).toEqual({ reason: "storage-type-mismatch" })
      expect(redirect).not.toHaveBeenCalled()
    })

    it("throws notFound for ceph + containers instead of redirecting to the canonical path", () => {
      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, {
          ...defaultParams,
          provider: "ceph",
          storageType: "containers",
        })
      )
      expect(caught.data).toEqual({ reason: "storage-type-mismatch" })
      expect(redirect).not.toHaveBeenCalled()
    })

    it("does not throw when storageType already matches the provider", () => {
      expect(() => {
        validateStorageAccess(defaultServices, {
          ...defaultParams,
          provider: "ceph",
          storageType: "buckets",
        })
      }).not.toThrow()

      expect(() => {
        validateStorageAccess(defaultServices, {
          ...defaultParams,
          provider: "swift",
          storageType: "containers",
        })
      }).not.toThrow()
    })
  })

  describe("Invalid provider (issue #1081)", () => {
    it.each(["nope", "", "__proto__"])("throws notFound with reason provider-not-found for %j", (provider) => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true, ceph: true },
      })

      const caught = expectNotFound(() => validateStorageAccess(defaultServices, { ...defaultParams, provider }))
      expect(caught.data).toEqual({ reason: "provider-not-found" })
      expect(redirect).not.toHaveBeenCalled()
    })

    it("reports provider-not-found, not storage-type-mismatch, when both segments are wrong", () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true, ceph: true },
      })

      const caught = expectNotFound(() =>
        validateStorageAccess(defaultServices, { ...defaultParams, provider: "nope", storageType: "buckets" })
      )
      expect(caught.data).toEqual({ reason: "provider-not-found" })
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe("Route lifecycle ordering", () => {
    // The loader asks two questions of two different routers: is the address valid
    // (`auth`), and does the container behind it exist (`storage`). Both halves are stubbed
    // so a test can fail on the one it is about rather than on a missing stub.
    const makeContext = (queryResult: unknown, containerProbe: () => Promise<unknown> = async () => ({})) => ({
      trpcClient: {
        auth: {
          getAvailableServices: {
            query: vi.fn().mockResolvedValue(queryResult),
          },
        },
        storage: {
          swift: { getContainerMetadata: { query: vi.fn(containerProbe) } },
          ceph: { containers: { head: { query: vi.fn(containerProbe) } } },
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

      await expect(
        callLoader(context, {
          projectId: "proj-1",
          provider: "nope",
          storageType: "nope",
          containerName: "my-container",
        })
      ).rejects.toThrow("Redirect to: /projects/proj-1")
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
        callLoader(context, {
          projectId: "proj-1",
          provider: "nope",
          storageType: "containers",
          containerName: "my-container",
        })
      )
      expect(caught.data).toEqual({ reason: "provider-not-found" })
    })

    it("throws notFound for ceph + containers instead of redirecting to the canonical path", async () => {
      vi.mocked(getServiceIndex).mockReturnValue({
        "object-store": { swift: true },
        "object-store-ceph": { ceph: true },
      })
      const context = makeContext(defaultServices)

      const caught = await expectNotFoundAsync(
        callLoader(context, {
          projectId: "proj-1",
          provider: "ceph",
          storageType: "containers",
          containerName: "my-container",
        })
      )
      expect(caught.data).toEqual({ reason: "storage-type-mismatch" })
      expect(redirect).not.toHaveBeenCalled()
    })
  })

  describe("Container existence (#1081 follow-up)", () => {
    const makeContext = (queryResult: unknown, containerProbe: () => Promise<unknown> = async () => ({})) => ({
      trpcClient: {
        auth: { getAvailableServices: { query: vi.fn().mockResolvedValue(queryResult) } },
        storage: {
          swift: { getContainerMetadata: { query: vi.fn(containerProbe) } },
          ceph: { containers: { head: { query: vi.fn(containerProbe) } } },
        },
      },
    })

    const callLoader = (context: unknown, params: unknown) =>
      (Route.options.loader as (ctx: unknown) => Promise<unknown>)({ context, params })

    const notFoundResponse = () =>
      TRPCClientError.from({
        error: { message: "mock", code: -32004, data: { code: "NOT_FOUND", httpStatus: 404, path: "storage" } },
      })

    it("throws notFound with the container reason when the container doesn't exist", async () => {
      vi.mocked(getServiceIndex).mockReturnValue({ "object-store": { swift: true } })
      const context = makeContext(defaultServices, async () => {
        throw notFoundResponse()
      })

      const caught = await expectNotFoundAsync(callLoader(context, defaultParams))
      expect(caught.data).toEqual({ reason: CONTAINER_NOT_FOUND })
    })

    it("does not touch storage at all when the address itself is invalid", async () => {
      // Ordering guard: a bad provider segment must not produce a storage request for a
      // provider that isn't one.
      vi.mocked(getServiceIndex).mockReturnValue({ "object-store": { swift: true } })
      const context = makeContext(defaultServices)

      await expectNotFoundAsync(callLoader(context, { ...defaultParams, provider: "nope" }))

      expect(context.trpcClient.storage.swift.getContainerMetadata.query).not.toHaveBeenCalled()
      expect(context.trpcClient.storage.ceph.containers.head.query).not.toHaveBeenCalled()
    })

    it("lets the page render when the container check fails for any other reason", async () => {
      // NO_CEPH_CREDENTIALS arrives as FORBIDDEN; a 404 page would hide the credential
      // prompt that is the actual fix.
      vi.mocked(getServiceIndex).mockReturnValue({ "object-store": { ceph: true } })
      const context = makeContext(defaultServices, async () => {
        throw TRPCClientError.from({
          error: { message: "NO_CEPH_CREDENTIALS", code: -32003, data: { code: "FORBIDDEN", httpStatus: 403 } },
        })
      })

      await expect(
        callLoader(context, { ...defaultParams, provider: "ceph", storageType: "buckets" })
      ).resolves.toMatchObject({ containerInfo: undefined })
    })

    it("hands the Swift probe's answer on as loader data so the header need not repeat it", async () => {
      vi.mocked(getServiceIndex).mockReturnValue({ "object-store": { swift: true } })
      const summary = { objectCount: 2, bytesUsed: 512 }
      const context = makeContext(defaultServices, async () => summary)

      await expect(callLoader(context, defaultParams)).resolves.toMatchObject({ containerInfo: summary })
    })
  })
})

describe("Objects Route - notFound boundary", () => {
  const NotFoundComponent = Route.options.notFoundComponent as (props: {
    data?: { reason?: string }
  }) => React.ReactElement

  const renderBoundary = (reason: string | undefined, provider = "ceph") => {
    vi.mocked(useParams).mockReturnValue({ projectId: "proj-1", provider, storageType: "buckets" })
    return render(
      <I18nProvider i18n={i18n}>
        <NotFoundComponent data={reason ? { reason } : undefined} />
      </I18nProvider>
    )
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // One boundary, two unrelated 404s — the split only holds if the reason is read.
  it("renders the resource-level error for a missing bucket, with a way back to the list", () => {
    renderBoundary(CONTAINER_NOT_FOUND, "ceph")

    expect(screen.getByText("Bucket Not Found")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Back to Buckets/i })).toBeInTheDocument()
  })

  it("uses container wording for Swift", () => {
    renderBoundary(CONTAINER_NOT_FOUND, "swift")

    expect(screen.getByText("Container Not Found")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Back to Containers/i })).toBeInTheDocument()
  })

  it("still renders the address-level 404 for a storage-type mismatch", () => {
    renderBoundary("storage-type-mismatch")

    expect(screen.getByText("Page Not Found")).toBeInTheDocument()
    expect(screen.getByText("This address is not valid for this object storage service.")).toBeInTheDocument()
  })

  it("falls back to the address-level 404 when no reason is carried", () => {
    renderBoundary(undefined)

    expect(screen.getByText("Object Storage Not Found")).toBeInTheDocument()
  })
})

describe("Objects Route - error boundary", () => {
  const ErrorComponent = Route.options.errorComponent as (props: { error: Error }) => React.ReactElement

  const renderError = (error: Error) => {
    vi.mocked(useParams).mockReturnValue({ projectId: "proj-1", provider: "ceph", storageType: "buckets" })
    return render(
      <I18nProvider i18n={i18n}>
        <ErrorComponent error={error} />
      </I18nProvider>
    )
  }

  // A failed request is not a missing resource. #1304 points one component at both
  // boundaries, which turns a 500 into a 404 "Resource Not Found"; this asserts the split.
  it("reports a failed request as an error, not as a 404", () => {
    renderError(new Error("boom"))

    expect(screen.getByText("Unable to Load Content")).toBeInTheDocument()
    expect(screen.queryByText("404")).not.toBeInTheDocument()
    expect(screen.queryByText(/Not Found/i)).not.toBeInTheDocument()
  })

  it("shows the server's own message for a tRPC error", () => {
    const trpcError = TRPCClientError.from({
      error: { message: "Failed to list objects", code: -32603, data: { code: "INTERNAL_SERVER_ERROR" } },
    })

    renderError(trpcError)

    expect(screen.getByText(/Failed to list objects/)).toBeInTheDocument()
  })

  // The point of the `code` prop: state what the server answered rather than inheriting
  // RouteIdLevelDefaultError's 404 default.
  it("shows the status the server actually answered with", () => {
    const trpcError = TRPCClientError.from({
      error: {
        message: "Failed to list objects",
        code: -32603,
        data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500 },
      },
    })

    renderError(trpcError)

    expect(screen.getByText("500")).toBeInTheDocument()
  })

  it("shows no status at all when the throw never reached the server", () => {
    renderError(new Error("boom"))

    expect(screen.queryByText("500")).not.toBeInTheDocument()
  })

  it("leads back to the list rather than out of storage", () => {
    renderError(new Error("boom"))

    expect(screen.getByRole("button", { name: /Back to Buckets/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Go to Project Home/i })).not.toBeInTheDocument()
  })
})

describe("Objects Route - View Parameter Handling", () => {
  // These tests verify the view parameter correctly branches the rendered component:
  // - Ceph + cors-rules → CephCorsRules
  // - Ceph + overview → CephObjects
  // - Swift + cors-rules → SwiftObjects (regression guard: Swift ignores view param)

  const Wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders CephCorsRules when provider is ceph and view is cors-rules", () => {
    vi.mocked(useParams).mockReturnValue({
      projectId: "proj-1",
      provider: "ceph",
      containerName: "bucket-1",
    })
    vi.spyOn(Route, "useSearch").mockReturnValue({
      view: "cors-rules",
      sortBy: "name",
      sortDirection: "asc",
      tab: "all",
    })

    render(<ObjectsDashboard />, { wrapper: Wrapper })

    expect(screen.getByTestId("ceph-cors-rules")).toBeInTheDocument()
    expect(screen.queryByTestId("ceph-objects")).not.toBeInTheDocument()
  })

  it("renders CephObjects when provider is ceph and view is overview", () => {
    vi.mocked(useParams).mockReturnValue({
      projectId: "proj-1",
      provider: "ceph",
      containerName: "bucket-1",
    })
    vi.spyOn(Route, "useSearch").mockReturnValue({
      view: "overview",
      sortBy: "name",
      sortDirection: "asc",
      tab: "all",
    })

    render(<ObjectsDashboard />, { wrapper: Wrapper })

    expect(screen.getByTestId("ceph-objects")).toBeInTheDocument()
    expect(screen.queryByTestId("ceph-cors-rules")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ceph-lifecycle-rules")).not.toBeInTheDocument()
  })

  it("renders CephLifecycleRules when provider is ceph and view is lifecycle-rules", () => {
    vi.mocked(useParams).mockReturnValue({
      projectId: "proj-1",
      provider: "ceph",
      containerName: "bucket-1",
    })
    vi.spyOn(Route, "useSearch").mockReturnValue({
      view: "lifecycle-rules",
      sortBy: "name",
      sortDirection: "asc",
      tab: "all",
    })

    render(<ObjectsDashboard />, { wrapper: Wrapper })

    expect(screen.getByTestId("ceph-lifecycle-rules")).toBeInTheDocument()
    expect(screen.queryByTestId("ceph-objects")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ceph-cors-rules")).not.toBeInTheDocument()
  })

  it("renders SwiftObjects when provider is swift, ignoring view=cors-rules", () => {
    vi.mocked(useParams).mockReturnValue({
      projectId: "proj-1",
      provider: "swift",
      containerName: "container-1",
    })
    vi.spyOn(Route, "useSearch").mockReturnValue({
      view: "cors-rules", // Swift should ignore this
      sortBy: "name",
      sortDirection: "asc",
      tab: "all",
    })

    render(<ObjectsDashboard />, { wrapper: Wrapper })

    expect(screen.getByTestId("swift-objects")).toBeInTheDocument()
    expect(screen.queryByTestId("ceph-objects")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ceph-cors-rules")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ceph-lifecycle-rules")).not.toBeInTheDocument()
  })

  it("renders SwiftObjects when provider is swift, ignoring view=lifecycle-rules", () => {
    vi.mocked(useParams).mockReturnValue({
      projectId: "proj-1",
      provider: "swift",
      containerName: "container-1",
    })
    vi.spyOn(Route, "useSearch").mockReturnValue({
      view: "lifecycle-rules", // Swift should ignore this
      sortBy: "name",
      sortDirection: "asc",
      tab: "all",
    })

    render(<ObjectsDashboard />, { wrapper: Wrapper })

    expect(screen.getByTestId("swift-objects")).toBeInTheDocument()
    expect(screen.queryByTestId("ceph-objects")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ceph-cors-rules")).not.toBeInTheDocument()
    expect(screen.queryByTestId("ceph-lifecycle-rules")).not.toBeInTheDocument()
  })
})

describe("Objects Route - Header rendering per provider", () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => <I18nProvider i18n={i18n}>{children}</I18nProvider>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders ContainerHeader (and not the Ceph header) when provider is swift", () => {
    vi.mocked(useParams).mockReturnValue({
      projectId: "proj-1",
      provider: "swift",
      containerName: "container-1",
    })
    vi.spyOn(Route, "useSearch").mockReturnValue({
      view: "overview",
      sortBy: "name",
      sortDirection: "asc",
      tab: "all",
    })

    render(<ObjectsDashboard />, { wrapper: Wrapper })

    expect(screen.getByTestId("swift-container-header")).toBeInTheDocument()
  })

  it("renders the Ceph header (and not ContainerHeader) when provider is ceph", () => {
    vi.mocked(useParams).mockReturnValue({
      projectId: "proj-1",
      provider: "ceph",
      containerName: "bucket-1",
    })
    vi.spyOn(Route, "useSearch").mockReturnValue({
      view: "overview",
      sortBy: "name",
      sortDirection: "asc",
      tab: "all",
    })

    render(<ObjectsDashboard />, { wrapper: Wrapper })

    expect(screen.getByTestId("ceph-objects")).toBeInTheDocument()
    expect(screen.queryByTestId("swift-container-header")).not.toBeInTheDocument()
  })
})
