import { describe, it, expect, vi, beforeEach } from "vitest"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import type { AuroraPortalContext } from "../../context"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { externalNetworksRouter } from "./externalNetworksRouter"

const createMockContext = () => {
  const controller = new AbortController()
  const get = vi.fn()
  const neutronService = { get }
  const catalog = [
    {
      type: "network",
      name: "neutron",
      id: "network-1",
      endpoints: [{ id: "e1", interface: "public", region: "qa-de-1", url: "https://neutron.example/" }],
    },
    {
      type: "kubernetes",
      name: "persephone-qa",
      id: "k1",
      endpoints: [{ id: "e2", interface: "public", region: "qa-de-1", url: "https://persephone.example/" }],
    },
  ]
  const mockOpenstackSession = {
    getToken: () => ({ authToken: "tok-123", tokenData: { catalog, project: { id: "p-1" } } }),
    service: vi.fn((name: string) => {
      if (name === "network") return neutronService
      throw new Error(`Unexpected service: ${name}`)
    }),
    getEndpoint: vi.fn(),
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
    externalNetworks: externalNetworksRouter,
  })
)

describe("externalNetworksRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("fetches external networks with router:external and shared filters", async () => {
    const { ctx, get } = createMockContext()
    get.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        networks: [
          {
            id: "net-1",
            name: "ext-net",
            description: "External network",
            availability_zones: ["az-1", "az-2"],
            status: "ACTIVE",
            admin_state_up: true,
            project_id: "admin-project",
            shared: true,
            subnets: [],
          },
          {
            id: "net-2",
            name: "floating-net",
            status: "ACTIVE",
            admin_state_up: true,
            project_id: "admin-project",
            shared: true,
            subnets: [],
          },
        ],
      }),
    })

    const caller = createCaller(ctx)
    const result = await caller.externalNetworks.list({ project_id: "p-1", landscape: "qa" })

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      id: "net-1",
      name: "ext-net",
      description: "External network",
      availability_zones: ["az-1", "az-2"],
      status: "ACTIVE",
    })
    expect(result[1]).toEqual({
      id: "net-2",
      name: "floating-net",
      description: "",
      availability_zones: [],
      status: "ACTIVE",
    })
    expect(get).toHaveBeenCalledWith("v2.0/networks?router:external=true&shared=true")
  })

  it("concatenates multiple pages", async () => {
    const { ctx, get } = createMockContext()
    let callCount = 0
    get.mockImplementation(async () => {
      callCount++
      if (callCount === 1) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            networks: [
              {
                id: "net-1",
                name: "net-1",
                status: "ACTIVE",
                admin_state_up: true,
                project_id: "admin",
                shared: true,
                subnets: [],
              },
              {
                id: "net-2",
                name: "net-2",
                status: "ACTIVE",
                admin_state_up: true,
                project_id: "admin",
                shared: true,
                subnets: [],
              },
            ],
            networks_links: [
              {
                rel: "next",
                href: "https://neutron.example/v2.0/networks?marker=net-2&router:external=true&shared=true",
              },
            ],
          }),
        }
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          networks: [
            {
              id: "net-3",
              name: "net-3",
              status: "ACTIVE",
              admin_state_up: true,
              project_id: "admin",
              shared: true,
              subnets: [],
            },
          ],
        }),
      }
    })

    const caller = createCaller(ctx)
    const result = await caller.externalNetworks.list({ project_id: "p-1", landscape: "qa" })

    expect(result).toHaveLength(3)
    expect(result.map((n) => n.id)).toEqual(["net-1", "net-2", "net-3"])
    expect(callCount).toBe(2)
  })

  it("maps 403 to FORBIDDEN with fixed message", async () => {
    const { ctx, get } = createMockContext()
    get.mockRejectedValue(new SignalOpenstackApiError("Neutron says forbidden", 403))

    const caller = createCaller(ctx)
    await expect(caller.externalNetworks.list({ project_id: "p-1", landscape: "qa" })).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Could not load external networks.",
    })
  })
})
