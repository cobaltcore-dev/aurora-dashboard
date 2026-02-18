import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { createCallerFactory, auroraRouter } from "../../trpc"
import { securityGroupRouter } from "./securityGroupRouter"
import { SecurityGroup } from "../types/securityGroup"
import { AuroraPortalContext } from "@/server/context"

const createMockContext = (opts?: { noNetworkService?: boolean; invalidSession?: boolean }) => {
  const { noNetworkService = false, invalidSession = false } = opts || {}

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    openstack: {
      service: vi.fn().mockImplementation((serviceName: string) => {
        if (serviceName !== "network" || noNetworkService) {
          return null
        }

        return {
          get: vi.fn().mockResolvedValue({
            json: vi.fn().mockResolvedValue({
              security_groups: [
                {
                  id: "sg-1",
                  name: "default",
                  description: "Default security group",
                  project_id: "proj-1",
                  shared: false,
                  stateful: true,
                  security_group_rules: [],
                },
              ],
            }),
          }),
        }
      }),
    },
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    rescopeSession: vi.fn(),
    getMultipartData: vi.fn(),
  } as unknown as AuroraPortalContext
}

const createCaller = createCallerFactory(
  auroraRouter({
    securityGroup: securityGroupRouter,
  })
)

describe("securityGroupRouter.list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a list of security groups on success", async () => {
    const ctx = createMockContext()
    const caller = createCaller(ctx)

    const result = await caller.securityGroup.list({
      limit: 10,
      sort_key: "name",
      sort_dir: "asc",
    })

    expect(Array.isArray(result)).toBe(true)
    expect(result.length).toBe(1)

    const sg: SecurityGroup = result[0]
    expect(sg.id).toBe("sg-1")
    expect(sg.name).toBe("default")
    expect(sg.project_id).toBe("proj-1")
  })

  it("throws UNAUTHORIZED when session is invalid", async () => {
    const ctx = createMockContext({ invalidSession: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.list({
        limit: 5,
      })
    ).rejects.toThrow(
      new TRPCError({
        code: "UNAUTHORIZED",
        message: "The session is invalid",
      })
    )
  })

  it("throws INTERNAL_SERVER_ERROR when network service is unavailable", async () => {
    const ctx = createMockContext({ noNetworkService: true })
    const caller = createCaller(ctx)

    await expect(
      caller.securityGroup.list({
        limit: 5,
      })
    ).rejects.toThrowError(TRPCError)

    try {
      await caller.securityGroup.list({ limit: 5 })
    } catch (error) {
      if (error instanceof TRPCError) {
        expect(error.code).toBe("INTERNAL_SERVER_ERROR")
        expect(error.message).toBe("Network service is not available")
      } else {
        throw error
      }
    }
  })
})
