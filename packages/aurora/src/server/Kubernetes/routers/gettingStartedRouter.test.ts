import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AuroraPortalContext } from "../../context"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { gettingStartedRouter } from "./gettingStartedRouter"

const url = "https://persephone-qa.example/"

const createMockContext = () => {
  const controller = new AbortController()
  const get = vi.fn()
  const getEndpoint = vi.fn((opts?: { interfaceName?: string }): string | null => {
    return opts?.interfaceName === "public" ? url : null
  })
  const service = { get, getEndpoint, post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() }
  const catalog = [
    {
      type: "kubernetes",
      name: "persephone-qa",
      id: "s1",
      endpoints: [{ id: "e1", interface: "public", region: "qa-de-1", region_id: "qa-de-1", url }],
    },
  ]
  const mockOpenstackSession = {
    getToken: () => ({ authToken: "tok-123", tokenData: { catalog, project: { id: "p-1" } } }),
    service: vi.fn().mockReturnValue(service),
  }
  const ctx = {
    validateSession: vi.fn().mockReturnValue(true),
    openstack: mockOpenstackSession,
    signal: controller.signal,
    rescopeSession: vi.fn().mockResolvedValue(mockOpenstackSession),
  } as unknown as AuroraPortalContext

  return { ctx, get, mockOpenstackSession }
}

const createCaller = createCallerFactory(
  auroraRouter({
    gettingStarted: gettingStartedRouter,
  })
)

describe("gettingStartedRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns markdown from ConfigMap", async () => {
    const { ctx, get } = createMockContext()
    get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          "README.md": "# Getting Started\n\nWelcome to Kubernetes!",
        },
      }),
    })

    const caller = createCaller(ctx)
    const result = await caller.gettingStarted.getGettingStarted({ project_id: "p-1", landscape: "qa" })

    expect(result.markdown).toBe("# Getting Started\n\nWelcome to Kubernetes!")
    expect(get).toHaveBeenCalledWith(
      "api/v1/namespaces/gardener-system-public/configmaps/scikube-getting-started-markdown",
      expect.any(Object)
    )
  })

  it("returns null markdown when ConfigMap key is missing", async () => {
    const { ctx, get } = createMockContext()
    get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          "OTHER.md": "some other content",
        },
      }),
    })

    const caller = createCaller(ctx)
    const result = await caller.gettingStarted.getGettingStarted({ project_id: "p-1", landscape: "qa" })

    expect(result.markdown).toBeNull()
  })

  it("returns null markdown when ConfigMap is not found (404)", async () => {
    const { ctx, get } = createMockContext()
    get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        kind: "Status",
        status: "Failure",
        code: 404,
        message: "not found",
      }),
    })

    const caller = createCaller(ctx)
    const result = await caller.gettingStarted.getGettingStarted({ project_id: "p-1", landscape: "qa" })

    expect(result.markdown).toBeNull()
  })

  it("throws on 403 (not NOT_FOUND)", async () => {
    const { ctx, get } = createMockContext()
    get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        kind: "Status",
        status: "Failure",
        code: 403,
        message: "forbidden",
      }),
    })

    const caller = createCaller(ctx)
    await expect(caller.gettingStarted.getGettingStarted({ project_id: "p-1", landscape: "qa" })).rejects.toMatchObject(
      {
        code: "FORBIDDEN",
      }
    )
  })

  it("returns NOT_FOUND for landscape missing from catalog", async () => {
    const { ctx, get } = createMockContext()
    // Empty catalog
    ctx.openstack!.getToken = () =>
      ({
        authToken: "tok-123",
        tokenData: {
          project: { id: "p-1", name: "test-project" },
          catalog: [],
          expires_at: "2026-12-31T23:59:59Z",
          issued_at: "2026-01-01T00:00:00Z",
          methods: ["password"],
          roles: [],
          user: { id: "u-1", name: "test-user", domain: { id: "default", name: "Default" }, password_expires_at: "" },
          system: { all: false },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock token data
      }) as any

    const caller = createCaller(ctx)
    await expect(caller.gettingStarted.getGettingStarted({ project_id: "p-1", landscape: "qa" })).rejects.toMatchObject(
      {
        code: "NOT_FOUND",
        message: expect.stringContaining("not available"),
      }
    )
    expect(get).not.toHaveBeenCalled()
  })
})
