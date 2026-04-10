import { describe, it, expect, vi, beforeEach } from "vitest"
import { createCallerFactory, auroraRouter, projectScopedProcedure, domainScopedProcedure } from "./trpc"
import { AuroraPortalContext } from "./context"
import { z } from "zod"

/**
 * Helper function to create a mock context for testing
 * This simulates the Aurora Portal context with OpenStack session management
 */
const createMockContext = (opts?: {
  invalidSession?: boolean
  rescopeFails?: boolean
  availableDomains?: Array<{ id: string; name: string }>
  currentProjectId?: string
  currentDomainId?: string
}) => {
  const {
    invalidSession = false,
    rescopeFails = false,
    availableDomains = [],
    currentProjectId,
    currentDomainId,
  } = opts || {}

  // Mock OpenStack session with token data
  const mockOpenstackSession = {
    isValid: vi.fn().mockReturnValue(true),
    getToken: vi.fn().mockReturnValue({
      authToken: "mock-token",
      tokenData: {
        project: currentProjectId ? { id: currentProjectId } : undefined,
        domain: currentDomainId ? { id: currentDomainId } : undefined,
        roles: [],
      },
    }),
    service: vi.fn(),
  }

  return {
    validateSession: vi.fn().mockReturnValue(!invalidSession),
    openstack: mockOpenstackSession,
    user: {
      availableDomains,
    },
    rescopeSession: vi.fn().mockImplementation(async (scope: { projectId?: string; domain_id?: string }) => {
      // Simulate rescoping failure
      if (rescopeFails) {
        return null
      }

      // Simulate successful rescoping by returning a new session with updated scope
      return {
        ...mockOpenstackSession,
        getToken: vi.fn().mockReturnValue({
          authToken: "rescoped-token",
          tokenData: {
            project: scope.projectId ? { id: scope.projectId } : undefined,
            domain: scope.domain_id ? { id: scope.domain_id } : undefined,
          },
        }),
      }
    }),
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    getMultipartData: vi.fn(),
  } as unknown as AuroraPortalContext
}

describe("projectScopedProcedure", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should throw BAD_REQUEST when project_id is missing from input", async () => {
    const ctx = createMockContext()

    // Create a test router using projectScopedProcedure
    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure.input(z.object({ otherField: z.string().optional() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ otherField: "value" })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        message: "project_id is required for project-scoped operations",
      })
    )
  })

  it("should throw BAD_REQUEST when project_id is an empty string", async () => {
    const ctx = createMockContext()

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure.input(z.object({ project_id: z.string() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "" })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        message: "project_id must be a non-empty string",
      })
    )
  })

  it("should throw BAD_REQUEST when project_id is only whitespace", async () => {
    const ctx = createMockContext()

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure.input(z.object({ project_id: z.string() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "   " })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        message: "project_id must be a non-empty string",
      })
    )
  })

  it("should throw UNAUTHORIZED when session rescoping fails", async () => {
    const ctx = createMockContext({ rescopeFails: true })

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure.input(z.object({ project_id: z.string() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "proj-123" })).rejects.toThrow(
      expect.objectContaining({
        code: "UNAUTHORIZED",
        message: expect.stringContaining("Failed to scope session to project"),
      })
    )
  })

  it("should successfully rescope session and pass it to the procedure", async () => {
    const ctx = createMockContext()

    let capturedCtx: AuroraPortalContext | undefined

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure.input(z.object({ project_id: z.string() })).query(async ({ ctx }) => {
          // Capture the context to verify it was updated
          capturedCtx = ctx
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    const result = await caller.test.testProcedure({ project_id: "proj-123" })

    // Verify the procedure executed successfully
    expect(result).toBe("success")

    // Verify rescopeSession was called with the correct project_id
    expect(ctx.rescopeSession).toHaveBeenCalledWith({ projectId: "proj-123" })

    // Verify the rescoped session was passed to the procedure
    expect(capturedCtx?.openstack).toBeDefined()
  })

  it("should cache the scoped token to avoid unnecessary rescoping", async () => {
    // When the current scope matches the requested scope, rescopeSession should
    // return the existing session without making a new Keystone API call
    const ctx = createMockContext({ currentProjectId: "proj-123" })

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure.input(z.object({ project_id: z.string() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await caller.test.testProcedure({ project_id: "proj-123" })

    // Verify rescopeSession was called
    // Note: The actual caching logic is in the context.ts rescopeSession implementation
    // This test verifies that the middleware calls rescopeSession correctly
    expect(ctx.rescopeSession).toHaveBeenCalledWith({ projectId: "proj-123" })
  })

  it("should work with additional input fields beyond project_id", async () => {
    const ctx = createMockContext()

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure
          .input(
            z.object({
              project_id: z.string(),
              limit: z.number().optional(),
              searchTerm: z.string().optional(),
            })
          )
          .query(async ({ input }) => {
            return {
              project_id: input.project_id,
              limit: input.limit,
              searchTerm: input.searchTerm,
            }
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    const result = await caller.test.testProcedure({
      project_id: "proj-123",
      limit: 10,
      searchTerm: "test",
    })

    expect(result).toEqual({
      project_id: "proj-123",
      limit: 10,
      searchTerm: "test",
    })

    expect(ctx.rescopeSession).toHaveBeenCalledWith({ projectId: "proj-123" })
  })
})

describe("domainScopedProcedure", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("should throw BAD_REQUEST when domain_id is missing from input", async () => {
    const ctx = createMockContext({ availableDomains: [{ id: "domain-123", name: "Domain 123" }] })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure.input(z.object({ otherField: z.string().optional() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ otherField: "value" })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        message: "domain_id is required for domain-scoped operations",
      })
    )
  })

  it("should throw BAD_REQUEST when domain_id is an empty string", async () => {
    const ctx = createMockContext({ availableDomains: [{ id: "domain-123", name: "Domain 123" }] })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure.input(z.object({ domain_id: z.string() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ domain_id: "" })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        message: "domain_id must be a non-empty string",
      })
    )
  })

  it("should throw FORBIDDEN when user does not have access to the requested domain", async () => {
    const ctx = createMockContext({
      availableDomains: [
        { id: "domain-abc", name: "Domain ABC" },
        { id: "domain-xyz", name: "Domain XYZ" },
      ],
    })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure.input(z.object({ domain_id: z.string() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ domain_id: "domain-not-accessible" })).rejects.toThrow(
      expect.objectContaining({
        code: "FORBIDDEN",
        message: expect.stringContaining("Access denied"),
      })
    )
  })

  it("should throw UNAUTHORIZED when session rescoping fails", async () => {
    const ctx = createMockContext({
      availableDomains: [{ id: "domain-123", name: "Domain 123" }],
      rescopeFails: true,
    })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure.input(z.object({ domain_id: z.string() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ domain_id: "domain-123" })).rejects.toThrow(
      expect.objectContaining({
        code: "UNAUTHORIZED",
        message: expect.stringContaining("Failed to scope session to domain"),
      })
    )
  })

  it("should successfully rescope session when user has access to the domain", async () => {
    const ctx = createMockContext({
      availableDomains: [
        { id: "domain-123", name: "Domain 123" },
        { id: "domain-456", name: "Domain 456" },
      ],
    })

    let capturedCtx: AuroraPortalContext | undefined

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure.input(z.object({ domain_id: z.string() })).query(async ({ ctx }) => {
          capturedCtx = ctx
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    const result = await caller.test.testProcedure({ domain_id: "domain-123" })

    // Verify the procedure executed successfully
    expect(result).toBe("success")

    // Verify rescopeSession was called with the correct domain_id
    expect(ctx.rescopeSession).toHaveBeenCalledWith({ domainId: "domain-123" })

    // Verify the rescoped session was passed to the procedure
    expect(capturedCtx?.openstack).toBeDefined()
  })

  it("should work with additional input fields beyond domain_id", async () => {
    const ctx = createMockContext({
      availableDomains: [{ id: "domain-123", name: "Domain 123" }],
    })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure
          .input(
            z.object({
              domain_id: z.string(),
              includeDisabled: z.boolean().optional(),
              searchTerm: z.string().optional(),
            })
          )
          .query(async ({ input }) => {
            return {
              domain_id: input.domain_id,
              includeDisabled: input.includeDisabled,
              searchTerm: input.searchTerm,
            }
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    const result = await caller.test.testProcedure({
      domain_id: "domain-123",
      includeDisabled: true,
      searchTerm: "user",
    })

    expect(result).toEqual({
      domain_id: "domain-123",
      includeDisabled: true,
      searchTerm: "user",
    })

    expect(ctx.rescopeSession).toHaveBeenCalledWith({ domainId: "domain-123" })
  })

  it("should cache the scoped token to avoid unnecessary rescoping", async () => {
    const ctx = createMockContext({
      availableDomains: [{ id: "domain-123", name: "Domain 123" }],
      currentDomainId: "domain-123",
    })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure.input(z.object({ domain_id: z.string() })).query(async () => {
          return "success"
        }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await caller.test.testProcedure({ domain_id: "domain-123" })

    // Verify rescopeSession was called
    // Note: The actual caching logic is in the context.ts rescopeSession implementation
    expect(ctx.rescopeSession).toHaveBeenCalledWith({ domainId: "domain-123" })
  })
})
