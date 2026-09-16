import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  createCallerFactory,
  auroraRouter,
  projectScopedProcedure,
  domainScopedProcedure,
  projectScopedInputSchema,
  domainScopedInputSchema,
} from "./trpc"
import { AuroraPortalContext } from "./context"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { z } from "zod"

/**
 * Helper function to create a mock context for testing
 * This simulates the Aurora Portal context with OpenStack session management
 */
const createMockContext = (opts?: {
  invalidSession?: boolean
  rescopeFails?: boolean
  rescopeThrows?: Error
  availableDomains?: Array<{ id: string; name: string }>
  currentProjectId?: string
  currentDomainId?: string
}) => {
  const {
    invalidSession = false,
    rescopeFails = false,
    rescopeThrows,
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
    identityEndpoint: "http://identity.example.com/",
    imageMetadataExcludedProperties: [],
    signal: new AbortController().signal,
    openstack: mockOpenstackSession,
    getUserInfo: vi.fn().mockResolvedValue({
      availableDomains,
    }),
    rescopeSession: vi.fn().mockImplementation(async (scope: { projectId?: string; domainId?: string }) => {
      // Simulate rescoping throwing (e.g. Keystone returns 401)
      if (rescopeThrows) {
        throw rescopeThrows
      }

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
            domain: scope.domainId ? { id: scope.domainId } : undefined,
          },
        }),
      }
    }),
    createSession: vi.fn(),
    terminateSession: vi.fn(),
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
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    // @ts-expect-error - Testing invalid input without project_id
    await expect(caller.test.testProcedure({ otherField: "value" })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
      })
    )
  })

  it("should throw BAD_REQUEST when project_id is an empty string", async () => {
    const ctx = createMockContext()

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "" })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        // Zod validation error for min length
      })
    )
  })

  it("should throw BAD_REQUEST when project_id is only whitespace", async () => {
    const ctx = createMockContext()

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "   " })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        // Zod validation error for min length after trim
      })
    )
  })

  it("should throw NOT_FOUND when rescoping returns null but the session is still valid", async () => {
    // A valid base token that cannot be scoped to the project means the project
    // does not exist or is not accessible - not a session problem.
    const ctx = createMockContext({ rescopeFails: true })

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "proj-123" })).rejects.toThrow(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: expect.stringContaining("Project not found or not accessible"),
      })
    )
  })

  it("should throw UNAUTHORIZED when rescoping returns null and the session is invalid", async () => {
    // The base token is no longer valid (e.g. session changed in another tab).
    // protectedProcedure rejects before rescoping is attempted.
    const ctx = createMockContext({ rescopeFails: true, invalidSession: true })

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "proj-123" })).rejects.toThrow(
      expect.objectContaining({
        code: "UNAUTHORIZED",
      })
    )
  })

  it("should throw NOT_FOUND when Keystone returns 401 but the base token is still valid", async () => {
    // Keystone returns 401 for an unauthorized/nonexistent project scope even
    // though the base token itself is valid. This must not be shown as a
    // "session expired" error.
    const ctx = createMockContext({ rescopeThrows: new SignalOpenstackApiError("Unauthorized", 401) })

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "does-not-exist" })).rejects.toThrow(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: expect.stringContaining("Project not found or not accessible"),
      })
    )
  })

  it("should throw UNAUTHORIZED when Keystone returns 401 and the base token is invalid", async () => {
    // protectedProcedure rejects before rescoping when the base token is invalid.
    const ctx = createMockContext({
      rescopeThrows: new SignalOpenstackApiError("Unauthorized", 401),
      invalidSession: true,
    })

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ project_id: "proj-123" })).rejects.toThrow(
      expect.objectContaining({
        code: "UNAUTHORIZED",
      })
    )
  })

  it("should successfully rescope session and pass it to the procedure", async () => {
    const ctx = createMockContext()

    let capturedCtx: AuroraPortalContext | undefined

    const testRouter = auroraRouter({
      test: {
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async ({ ctx }) => {
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
        testProcedure: projectScopedProcedure
          .input(projectScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
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
            projectScopedInputSchema.extend({
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
        testProcedure: domainScopedProcedure
          .input(domainScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    // @ts-expect-error - Testing invalid input without domain_id
    await expect(caller.test.testProcedure({ otherField: "value" })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
      })
    )
  })

  it("should throw BAD_REQUEST when domain_id is an empty string", async () => {
    const ctx = createMockContext({ availableDomains: [{ id: "domain-123", name: "Domain 123" }] })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure
          .input(domainScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ domain_id: "" })).rejects.toThrow(
      expect.objectContaining({
        code: "BAD_REQUEST",
        // Zod validation error for min length
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
        testProcedure: domainScopedProcedure
          .input(domainScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
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

  it("should throw NOT_FOUND when rescoping returns null but the session is still valid", async () => {
    const ctx = createMockContext({
      availableDomains: [{ id: "domain-123", name: "Domain 123" }],
      rescopeFails: true,
    })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure
          .input(domainScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ domain_id: "domain-123" })).rejects.toThrow(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: expect.stringContaining("Domain not found or not accessible"),
      })
    )
  })

  it("should throw NOT_FOUND when Keystone returns 401 but the base token is still valid", async () => {
    const ctx = createMockContext({
      availableDomains: [{ id: "domain-123", name: "Domain 123" }],
      rescopeThrows: new SignalOpenstackApiError("Unauthorized", 401),
    })

    const testRouter = auroraRouter({
      test: {
        testProcedure: domainScopedProcedure
          .input(domainScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
            return "success"
          }),
      },
    })

    const caller = createCallerFactory(testRouter)(ctx)

    await expect(caller.test.testProcedure({ domain_id: "domain-123" })).rejects.toThrow(
      expect.objectContaining({
        code: "NOT_FOUND",
        message: expect.stringContaining("Domain not found or not accessible"),
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
        testProcedure: domainScopedProcedure
          .input(domainScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async ({ ctx }) => {
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
            domainScopedInputSchema.extend({
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
        testProcedure: domainScopedProcedure
          .input(domainScopedInputSchema.extend({ otherField: z.string().optional() }))
          .query(async () => {
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
