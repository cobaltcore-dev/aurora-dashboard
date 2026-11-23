import { describe, it, expect, vi, beforeEach } from "vitest"
import type { AuroraPortalContext } from "../../context"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { cloudProfilesRouter } from "./cloudProfilesRouter"

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
    cloudProfiles: cloudProfilesRouter,
  })
)

describe("cloudProfilesRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches cloud profiles", async () => {
    const { ctx, get } = createMockContext()
    get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          {
            metadata: { name: "openstack", uid: "abc-123" },
            spec: {
              kubernetes: { versions: [{ version: "1.30.2" }] },
              machineTypes: [{ name: "m1.large" }],
              machineImages: [{ name: "ubuntu", versions: [{ version: "20.04" }] }],
              regions: [{ name: "qa-de-1" }],
            },
          },
        ],
      }),
    })

    const caller = createCaller(ctx)
    const result = await caller.cloudProfiles.list({ project_id: "p-1", landscape: "qa" })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("openstack")
    expect(get).toHaveBeenCalledWith("apis/core.gardener.cloud/v1beta1/cloudprofiles", expect.any(Object))
  })

  it("maps 403 to FORBIDDEN", async () => {
    const { ctx, get } = createMockContext()
    get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ kind: "Status", status: "Failure", code: 403, message: "forbidden" }),
    })

    const caller = createCaller(ctx)
    await expect(caller.cloudProfiles.list({ project_id: "p-1", landscape: "qa" })).rejects.toMatchObject({
      code: "FORBIDDEN",
    })
  })
})
