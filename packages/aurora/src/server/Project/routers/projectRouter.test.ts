import { describe, it, expect, vi, beforeEach } from "vitest"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { projectRouter } from "./projectRouter"
import { AuroraPortalContext } from "../../context"
import { TRPCError } from "@trpc/server"

const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

const makeCtx = (overrides?: Partial<AuroraPortalContext>) =>
  ({
    identityEndpoint: "https://identity.example.com/v3/",
    validateSession: vi.fn().mockReturnValue(true),
    imageMetadataExcludedProperties: [],
    signal: new AbortController().signal,
    openstack: {
      isValid: vi.fn().mockReturnValue(true),
      getToken: vi.fn().mockReturnValue({ authToken: "test-token", tokenData: {} }),
      service: vi.fn(),
    },
    getUserInfo: vi.fn().mockResolvedValue({ availableDomains: [] }),
    rescopeSession: vi.fn(),
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    ...overrides,
  }) as unknown as AuroraPortalContext

const createCaller = createCallerFactory(auroraRouter({ ...projectRouter }))

const projectsPayload = {
  projects: [
    { id: "p1", name: "shadowvault", enabled: true, domain_id: "d1" },
    { id: "p2", name: "ironkeep", enabled: true, domain_id: "d2" },
    { id: "p3", name: "stormwatch", enabled: true, domain_id: "unknown-domain" },
  ],
}

const domainsPayload = {
  domains: [
    { id: "d1", name: "monsoon3" },
    { id: "d2", name: "prod" },
  ],
}

describe("projectRouter.getAuthProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("attaches domain_name by resolving domain_id", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(projectsPayload) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(domainsPayload) } as Response)

    const caller = createCaller(makeCtx())
    const result = await caller.getAuthProjects()

    expect(result?.find((p) => p.id === "p1")?.domain_name).toBe("monsoon3")
    expect(result?.find((p) => p.id === "p2")?.domain_name).toBe("prod")
  })

  it("leaves domain_name undefined when domain_id has no match", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(projectsPayload) } as Response)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(domainsPayload) } as Response)

    const caller = createCaller(makeCtx())
    const result = await caller.getAuthProjects()

    expect(result?.find((p) => p.id === "p3")?.domain_name).toBeUndefined()
  })

  it("throws UNAUTHORIZED when no openstack session", async () => {
    const caller = createCaller(makeCtx({ openstack: undefined }))
    await expect(caller.getAuthProjects()).rejects.toBeInstanceOf(TRPCError)
  })
})
