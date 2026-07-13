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
    { id: "d1", name: "domain-alpha" },
    { id: "d2", name: "domain-beta" },
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

    expect(result?.find((p) => p.id === "p1")?.domain_name).toBe("domain-alpha")
    expect(result?.find((p) => p.id === "p2")?.domain_name).toBe("domain-beta")
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

  it("still returns projects with empty domain map when domains fetch fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(projectsPayload) } as Response)
      .mockRejectedValueOnce(new Error("network error"))

    const caller = createCaller(makeCtx())
    const result = await caller.getAuthProjects()

    expect(result).toHaveLength(3)
    expect(result?.every((p) => p.domain_name === undefined)).toBe(true)
  })
})

describe("projectRouter.getProject", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns the project when found", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ project: { id: "p1", name: "shadowvault", enabled: true } }),
    } as Response)

    const caller = createCaller(makeCtx())
    const result = await caller.getProject({ projectId: "p1" })

    expect(result?.id).toBe("p1")
    expect(result?.name).toBe("shadowvault")
  })

  it("returns null when project is not found (404)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404, statusText: "Not Found" } as Response)

    const caller = createCaller(makeCtx())
    const result = await caller.getProject({ projectId: "nonexistent" })

    expect(result).toBeNull()
  })

  it("returns null when access is denied (403)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, statusText: "Forbidden" } as Response)

    const caller = createCaller(makeCtx())
    const result = await caller.getProject({ projectId: "p1" })

    expect(result).toBeNull()
  })

  it("returns null when fetch fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("network error"))

    const caller = createCaller(makeCtx())
    const result = await caller.getProject({ projectId: "p1" })

    expect(result).toBeNull()
  })

  it("throws UNAUTHORIZED when no openstack session", async () => {
    const caller = createCaller(makeCtx({ openstack: undefined }))
    await expect(caller.getProject({ projectId: "p1" })).rejects.toBeInstanceOf(TRPCError)
  })
})
