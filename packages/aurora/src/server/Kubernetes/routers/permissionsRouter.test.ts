import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AuroraPortalContext } from "../../context"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { permissionsRouter } from "./permissionsRouter"

const url = "https://persephone-qa.example/"

const createMockContext = () => {
  const controller = new AbortController()
  const post = vi.fn()
  const getEndpoint = vi.fn((opts?: { interfaceName?: string }): string | null => {
    return opts?.interfaceName === "public" ? url : null
  })
  const service = { get: vi.fn(), getEndpoint, post, put: vi.fn(), patch: vi.fn(), del: vi.fn() }
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

  return { ctx, post, mockOpenstackSession }
}

const createCaller = createCallerFactory(
  auroraRouter({
    permissions: permissionsRouter,
  })
)

describe("permissionsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("checks all six permissions", async () => {
    const { ctx, post } = createMockContext()
    let callCount = 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock body type
    post.mockImplementation(async (_path: string, body: any) => {
      callCount++
      const verb = body.spec.resourceAttributes.verb

      // Allow list, get, create, and create/adminkubeconfig; deny update and delete
      const allowed = verb === "list" || verb === "get" || verb === "create"

      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: { allowed },
        }),
      }
    })

    const caller = createCaller(ctx)
    const result = await caller.permissions.getPermissions({ project_id: "p-1", landscape: "qa" })

    expect(result).toEqual({
      clusters: {
        list: true,
        get: true,
        create: true,
        update: false,
        delete: false,
      },
      clustersAdminKubeconfig: true,
    })
    expect(callCount).toBe(6)
    expect(post).toHaveBeenCalledWith(
      "apis/authorization.k8s.io/v1/selfsubjectaccessreviews",
      expect.objectContaining({
        apiVersion: "authorization.k8s.io/v1",
        kind: "SelfSubjectAccessReview",
        spec: expect.objectContaining({
          resourceAttributes: expect.objectContaining({
            namespace: "garden-qa-de-1-p-1",
            group: "core.gardener.cloud",
            resource: "shoots",
          }),
        }),
      }),
      expect.any(Object)
    )
  })

  it("treats missing status as false", async () => {
    const { ctx, post } = createMockContext()
    post.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}), // No status field
    })

    const caller = createCaller(ctx)
    const result = await caller.permissions.getPermissions({ project_id: "p-1", landscape: "qa" })

    expect(result.clusters.list).toBe(false)
    expect(result.clusters.get).toBe(false)
    expect(result.clustersAdminKubeconfig).toBe(false)
  })

  it("maps 401 with valid session to BAD_GATEWAY", async () => {
    const { ctx, post } = createMockContext()
    post.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        kind: "Status",
        status: "Failure",
        code: 401,
        message: "unauthorized",
      }),
    })

    const caller = createCaller(ctx)
    await expect(caller.permissions.getPermissions({ project_id: "p-1", landscape: "qa" })).rejects.toMatchObject({
      code: "BAD_GATEWAY",
    })
  })

  it("checks the adminkubeconfig subresource", async () => {
    const { ctx, post } = createMockContext()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock body type
    post.mockImplementation(async (_path: string, body: any) => {
      const subresource = body.spec.resourceAttributes.subresource
      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: { allowed: subresource === "adminkubeconfig" },
        }),
      }
    })

    const caller = createCaller(ctx)
    const result = await caller.permissions.getPermissions({ project_id: "p-1", landscape: "qa" })

    expect(result.clustersAdminKubeconfig).toBe(true)
    // Find the call with adminkubeconfig
    const adminCall = post.mock.calls.find((call) => call[1].spec.resourceAttributes.subresource === "adminkubeconfig")
    expect(adminCall).toBeDefined()
    expect(adminCall![1].spec.resourceAttributes.verb).toBe("create")
  })
})
