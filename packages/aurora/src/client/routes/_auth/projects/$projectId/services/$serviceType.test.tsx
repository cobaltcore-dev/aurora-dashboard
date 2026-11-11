import { describe, it, expect, vi, beforeEach } from "vitest"
import { redirect, isNotFound } from "@tanstack/react-router"
import { getServiceIndex } from "@/server/Authentication/helpers"
import type { ServiceExtension } from "@/client/AuroraApp"
import { Route } from "./$serviceType"

// Mock redirect so the guard's `throw redirect(...)` becomes an assertable thrown Error,
// mirroring the pattern used by the storage route guard tests.
vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual("@tanstack/react-router")
  return {
    ...actual,
    redirect: vi.fn((args: { to: string; params?: Record<string, string> }) => {
      let resolvedPath: string = args.to
      if (args.params) {
        for (const [key, value] of Object.entries(args.params)) {
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

const pcaExtension: ServiceExtension = {
  serviceType: "pca",
  serviceName: "clavis",
  label: "PCA (Clavis)",
  component: () => null,
}

// The guard only reads a handful of context fields; cast a partial object to the route's context shape.
type GuardContext = {
  serviceExtensions: ServiceExtension[]
  enabledServices?: string[]
  deniedServices?: string[]
  trpcClient?: { auth: { getAvailableServices: { query: () => Promise<{ name: string; type: string }[]> } } }
}

function invokeGuard(context: GuardContext, params: { projectId: string; serviceType: string }) {
  const beforeLoad = Route.options.beforeLoad as (args: {
    context: GuardContext
    params: { projectId: string; serviceType: string }
  }) => Promise<void>
  return beforeLoad({ context, params })
}

function makeContext(overrides: Partial<GuardContext> = {}): GuardContext {
  return {
    serviceExtensions: [pcaExtension],
    enabledServices: undefined,
    deniedServices: undefined,
    trpcClient: {
      auth: { getAvailableServices: { query: vi.fn().mockResolvedValue([{ type: "pca", name: "clavis" }]) } },
    },
    ...overrides,
  }
}

describe("Service extension route guard ($serviceType.beforeLoad)", () => {
  const params = { projectId: "proj-1", serviceType: "pca" }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServiceIndex).mockReturnValue({ pca: { clavis: true } })
  })

  it("allows access when the extension is registered, enabled, and present in the catalog", async () => {
    await expect(invokeGuard(makeContext(), params)).resolves.toBeUndefined()
    expect(redirect).not.toHaveBeenCalled()
  })

  it("throws notFound when the serviceType is not a registered extension", async () => {
    let caught: unknown
    try {
      await invokeGuard(makeContext({ serviceExtensions: [] }), params)
    } catch (err) {
      caught = err
    }
    expect(isNotFound(caught)).toBe(true)
  })

  it("redirects to the project home when the service is not in enabledServices (hidden from nav)", async () => {
    await expect(invokeGuard(makeContext({ enabledServices: ["ceph-containers", "flavors"] }), params)).rejects.toThrow(
      "Redirect to: /projects/proj-1"
    )
  })

  it("allows access when the service is included in enabledServices", async () => {
    await expect(invokeGuard(makeContext({ enabledServices: ["pca"] }), params)).resolves.toBeUndefined()
  })

  it("redirects when the service is explicitly denied, even if it is in enabledServices", async () => {
    await expect(
      invokeGuard(makeContext({ enabledServices: ["pca"], deniedServices: ["pca"] }), params)
    ).rejects.toThrow("Redirect to: /projects/proj-1")
  })

  it("redirects when the service is missing from the OpenStack catalog", async () => {
    vi.mocked(getServiceIndex).mockReturnValue({ compute: { nova: true } })
    await expect(invokeGuard(makeContext(), params)).rejects.toThrow("Redirect to: /projects/proj-1")
  })

  it("redirects when the catalog query fails", async () => {
    const context = makeContext({
      trpcClient: {
        auth: { getAvailableServices: { query: vi.fn().mockRejectedValue(new Error("network")) } },
      },
    })
    await expect(invokeGuard(context, params)).rejects.toThrow("Redirect to: /projects/proj-1")
  })
})
