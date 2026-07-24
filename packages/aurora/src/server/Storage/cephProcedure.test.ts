import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import type { S3Client } from "@aws-sdk/client-s3"
import { AuroraPortalContext } from "../context"
import { cephProcedure, cephProtectedProcedure, cephUploadProcedure, NO_CEPH_CREDENTIALS } from "./cephProcedure"
import { createCallerFactory, auroraRouter } from "../trpc"
import { octetInputParser } from "@trpc/server/http"
import { z } from "zod"

// ============================================================================
// MOCK DEPENDENCIES
// ============================================================================

vi.mock("./middleware/resolveEC2Credential", () => ({
  resolveEC2Credential: vi.fn(),
}))

vi.mock("./clients/s3Client", () => ({
  createS3Client: vi.fn(),
}))

import { resolveEC2Credential } from "./middleware/resolveEC2Credential"
import { createS3Client } from "./clients/s3Client"

const mockResolveEC2Credential = vi.mocked(resolveEC2Credential)
const mockCreateS3Client = vi.mocked(createS3Client)

// Mock S3Client type for tests
type MockS3Client = Pick<S3Client, "send">

// ============================================================================
// MOCK DATA / TEST CONSTANTS
// ============================================================================

const TEST_PROJECT_ID = "test-project-id"
const TEST_USER_ID = "test-user-id"
const TEST_ACCESS = "AKIAIOSFODNN7EXAMPLE"
const TEST_SECRET = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
const TEST_CEPH_ENDPOINT = "https://rgw.st1.qa-de-1.cloud.sap/swift/v1/AUTH_project"
const TEST_CEPH_ENDPOINT_NO_SWIFT = "https://rgw.st1.eu-de-2.cloud.sap"

// ============================================================================
// MOCK CONTEXT FACTORY
// ============================================================================

interface MockContextOptions {
  shouldFailAuth?: boolean
  hasCredentials?: boolean
  endpoint?: string
  region?: string
  hasToken?: boolean
  hasCatalog?: boolean
  hasCephService?: boolean
  hasRegion?: boolean
}

const createMockContext = (options: MockContextOptions = {}) => {
  const {
    shouldFailAuth = false,
    endpoint = TEST_CEPH_ENDPOINT,
    region = "qa-de-1",
    hasToken = true,
    hasCatalog = true,
    hasCephService = true,
    hasRegion = true,
  } = options

  const mockCephService = {
    getEndpoint: () => endpoint,
    availableEndpoints: () =>
      hasRegion ? [{ region, url: endpoint, interface: "public", id: "test-id", region_id: region }] : [],
  }

  const cephCatalogEntry = hasCephService
    ? {
        type: "ceph",
        name: "ceph",
        endpoints: hasRegion ? [{ region, url: endpoint }] : [],
      }
    : null

  const mockToken = hasToken
    ? {
        tokenData: {
          project: { id: TEST_PROJECT_ID },
          user: {
            id: TEST_USER_ID,
            domain: { id: "default", name: "Default" },
            name: "test-user",
            password_expires_at: "",
          },
          catalog: hasCatalog && cephCatalogEntry ? [cephCatalogEntry] : [],
          expires_at: "",
          issued_at: "",
          methods: [],
          roles: [],
        },
      }
    : null

  const mockOpenstack =
    hasToken && hasCatalog
      ? {
          service: (serviceName: string) => {
            if (serviceName === "ceph" && hasCephService) return mockCephService
            return null
          },
          getToken: vi.fn().mockReturnValue(mockToken),
        }
      : {
          service: () => null,
          getToken: vi.fn().mockReturnValue(null),
        }

  return {
    req: { headers: {} },
    validateSession: vi.fn().mockReturnValue(!shouldFailAuth),
    identityEndpoint: "http://identity.example.com/",
    cephRegion: "ceph-objectstore-st1-test-region",
    imageMetadataExcludedProperties: [],
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    openstack: mockOpenstack,
    rescopeSession: vi.fn().mockResolvedValue(mockOpenstack),
  } as unknown as AuroraPortalContext
}

// ============================================================================
// TEST ROUTERS
// ============================================================================

// Simple test router to verify middleware behavior
const testRouter = {
  checkStatus: cephProcedure.input(z.object({ project_id: z.string() })).query(async ({ ctx }) => {
    return {
      hasCredentials: !!ctx.cephCredentials,
      region: ctx.cephRegion,
    }
  }),

  requireCredentials: cephProtectedProcedure.input(z.object({ project_id: z.string() })).query(async ({ ctx }) => {
    return {
      hasCredentials: !!ctx.cephCredentials,
      region: ctx.cephRegion,
    }
  }),

  getClient: cephProcedure.input(z.object({ project_id: z.string() })).query(async ({ ctx }) => {
    const client = ctx.getCephClient()
    return { clientCreated: !!client }
  }),

  // Octet-stream upload procedure — mirrors objectRouter.uploadObject's use of
  // cephUploadProcedure, which rescopes from the x-upload-project-id header.
  // Also surfaces the downstream ctx.openstack tag so a test can assert the
  // rescoped session (not the pre-rescope one) is handed on.
  uploadClient: cephUploadProcedure.input(octetInputParser).mutation(async ({ ctx }) => {
    const client = ctx.getCephClient()
    return { clientCreated: !!client, openstackTag: (ctx.openstack as { __tag?: string }).__tag }
  }),
}

const createCaller = createCallerFactory(auroraRouter({ test: testRouter }))

// ============================================================================
// TESTS
// ============================================================================

describe("cephProcedure", () => {
  describe("resolveS3Config", () => {
    describe("endpoint extraction", () => {
      beforeEach(() => {
        vi.clearAllMocks()
        // Set default CEPH_REGION for tests
        process.env.CEPH_REGION = "ceph-objectstore-ec-st1-qa-de-1"
        mockResolveEC2Credential.mockResolvedValue({
          credentialId: "cred-id",
          access: TEST_ACCESS,
          secret: TEST_SECRET,
        })
        mockCreateS3Client.mockReturnValue({ send: vi.fn() } as MockS3Client as S3Client)
      })

      it("extracts base endpoint by removing /swift/ suffix", async () => {
        const ctx = createMockContext({ endpoint: TEST_CEPH_ENDPOINT })
        const caller = createCaller(ctx)

        await caller.test.getClient({ project_id: TEST_PROJECT_ID })

        expect(mockCreateS3Client).toHaveBeenCalledWith(
          TEST_ACCESS,
          TEST_SECRET,
          "https://rgw.st1.qa-de-1.cloud.sap",
          expect.any(String)
        )
      })

      it("handles endpoints without Swift suffix", async () => {
        const ctx = createMockContext({ endpoint: TEST_CEPH_ENDPOINT_NO_SWIFT, region: "eu-de-2" })
        const caller = createCaller(ctx)

        await caller.test.getClient({ project_id: TEST_PROJECT_ID })

        expect(mockCreateS3Client).toHaveBeenCalledWith(
          TEST_ACCESS,
          TEST_SECRET,
          TEST_CEPH_ENDPOINT_NO_SWIFT,
          expect.any(String)
        )
      })
    })

    describe("error handling", () => {
      beforeEach(() => {
        vi.clearAllMocks()
        mockResolveEC2Credential.mockResolvedValue({
          credentialId: "cred-id",
          access: TEST_ACCESS,
          secret: TEST_SECRET,
        })
      })

      it("throws when OpenStack token is missing", async () => {
        const ctx = createMockContext({ hasToken: false })
        const caller = createCaller(ctx)

        await expect(caller.test.checkStatus({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
          "Ceph service not found in OpenStack service catalog"
        )
      })

      it("throws when service catalog is missing", async () => {
        const ctx = createMockContext({ hasCatalog: false })
        const caller = createCaller(ctx)

        await expect(caller.test.checkStatus({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
          "Ceph service not found in OpenStack service catalog"
        )
      })

      it("throws when Ceph service not found in catalog", async () => {
        const ctx = createMockContext({ hasCephService: false })
        const caller = createCaller(ctx)

        await expect(caller.test.checkStatus({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
          "Ceph service not found in OpenStack service catalog"
        )
      })

      it("throws when region not found in Ceph service endpoints", async () => {
        const ctx = createMockContext({ hasRegion: false })
        const caller = createCaller(ctx)

        await expect(caller.test.checkStatus({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
          "Region not found in Ceph service endpoints"
        )
      })
    })
  })

  describe("cephCredentialMiddleware", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      mockCreateS3Client.mockReturnValue({ send: vi.fn() } as MockS3Client as S3Client)
    })

    it("resolves EC2 credentials and adds to context", async () => {
      mockResolveEC2Credential.mockResolvedValue({ credentialId: "cred-id", access: TEST_ACCESS, secret: TEST_SECRET })
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const result = await caller.test.checkStatus({ project_id: TEST_PROJECT_ID })

      expect(result.hasCredentials).toBe(true)
      expect(mockResolveEC2Credential).toHaveBeenCalledWith(ctx)
    })

    it("adds cephRegion to context", async () => {
      mockResolveEC2Credential.mockResolvedValue({ credentialId: "cred-id", access: TEST_ACCESS, secret: TEST_SECRET })
      const ctx = createMockContext({ region: "eu-de-2" })
      const caller = createCaller(ctx)

      const result = await caller.test.checkStatus({ project_id: TEST_PROJECT_ID })

      expect(result.region).toBe("ceph-objectstore-st1-test-region")
    })

    it("adds getCephClient factory to context", async () => {
      mockResolveEC2Credential.mockResolvedValue({ credentialId: "cred-id", access: TEST_ACCESS, secret: TEST_SECRET })
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const result = await caller.test.getClient({ project_id: TEST_PROJECT_ID })

      expect(result.clientCreated).toBe(true)
      expect(mockCreateS3Client).toHaveBeenCalledWith(TEST_ACCESS, TEST_SECRET, expect.any(String), expect.any(String))
    })

    it("returns null credentials when no EC2 credentials exist", async () => {
      mockResolveEC2Credential.mockResolvedValue(null)
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const result = await caller.test.checkStatus({ project_id: TEST_PROJECT_ID })

      expect(result.hasCredentials).toBe(false)
    })

    it("getCephClient throws FORBIDDEN when credentials are null", async () => {
      mockResolveEC2Credential.mockResolvedValue(null)
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await expect(caller.test.getClient({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({
          code: "FORBIDDEN",
          message: NO_CEPH_CREDENTIALS,
        })
      )
    })
  })

  describe("cephProtectedProcedure", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      process.env.CEPH_REGION = "ceph-objectstore-ec-st1-qa-de-1"
      mockCreateS3Client.mockReturnValue({ send: vi.fn() } as MockS3Client as S3Client)
    })

    it("throws FORBIDDEN with NO_CEPH_CREDENTIALS when credentials missing", async () => {
      mockResolveEC2Credential.mockResolvedValue(null)
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await expect(caller.test.requireCredentials({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({
          code: "FORBIDDEN",
          message: NO_CEPH_CREDENTIALS,
        })
      )
    })

    it("allows execution when credentials exist", async () => {
      mockResolveEC2Credential.mockResolvedValue({ credentialId: "cred-id", access: TEST_ACCESS, secret: TEST_SECRET })
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      const result = await caller.test.requireCredentials({ project_id: TEST_PROJECT_ID })

      expect(result.hasCredentials).toBe(true)
    })
  })

  describe("cephUploadProcedure", () => {
    beforeEach(() => {
      vi.clearAllMocks()
      process.env.CEPH_REGION = "ceph-objectstore-ec-st1-qa-de-1"
      mockResolveEC2Credential.mockResolvedValue({ credentialId: "cred-id", access: TEST_ACCESS, secret: TEST_SECRET })
      mockCreateS3Client.mockReturnValue({ send: vi.fn() } as MockS3Client as S3Client)
    })

    // octetInputParser never runs under createCaller (no HTTP transport), so we
    // pass a ReadableStream directly, cast to satisfy the runtime type.
    const callUpload = (caller: ReturnType<typeof createCaller>) =>
      caller.test.uploadClient(new ReadableStream() as never)

    const setUploadProjectId = (ctx: AuroraPortalContext, projectId: string) => {
      ;(ctx.req.headers as Record<string, string>)["x-upload-project-id"] = projectId
    }

    it("throws BAD_REQUEST when the x-upload-project-id header is missing", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx)

      await expect(callUpload(caller)).rejects.toThrow(
        new TRPCError({ code: "BAD_REQUEST", message: "x-upload-project-id header is required for uploads" })
      )
    })

    it("rescopes the session to the project id from the header", async () => {
      const ctx = createMockContext()
      setUploadProjectId(ctx, TEST_PROJECT_ID)
      const caller = createCaller(ctx)

      await callUpload(caller)

      expect(ctx.rescopeSession).toHaveBeenCalledWith({ projectId: TEST_PROJECT_ID })
    })

    it("resolves credentials and exposes a getCephClient factory", async () => {
      const ctx = createMockContext()
      setUploadProjectId(ctx, TEST_PROJECT_ID)
      const caller = createCaller(ctx)

      const result = await callUpload(caller)

      expect(result.clientCreated).toBe(true)
      expect(mockCreateS3Client).toHaveBeenCalledWith(TEST_ACCESS, TEST_SECRET, expect.any(String), expect.any(String))
    })

    it("hands the rescoped session (not the request default) to downstream resolvers", async () => {
      const ctx = createMockContext()
      setUploadProjectId(ctx, TEST_PROJECT_ID)
      // Return a distinct, tagged session from rescopeSession so we can tell it
      // apart from the pre-rescope ctx.openstack. It still needs service()/
      // getToken() for resolveS3Config.
      const rescoped = {
        service: ctx.openstack!.service,
        getToken: ctx.openstack!.getToken,
        __tag: "rescoped",
      }
      vi.mocked(ctx.rescopeSession).mockResolvedValue(rescoped as never)
      const caller = createCaller(ctx)

      const result = await callUpload(caller)

      expect(result.openstackTag).toBe("rescoped")
    })

    it("throws UNAUTHORIZED when the session cannot be scoped to the project", async () => {
      const ctx = createMockContext()
      setUploadProjectId(ctx, TEST_PROJECT_ID)
      vi.mocked(ctx.rescopeSession).mockResolvedValue(null as never)
      const caller = createCaller(ctx)

      await expect(callUpload(caller)).rejects.toThrow(
        new TRPCError({
          code: "UNAUTHORIZED",
          message: "Failed to scope session to project. User may not have access to this project.",
        })
      )
    })

    it("throws FORBIDDEN when the project has no EC2 credentials", async () => {
      mockResolveEC2Credential.mockResolvedValue(null)
      const ctx = createMockContext()
      setUploadProjectId(ctx, TEST_PROJECT_ID)
      const caller = createCaller(ctx)

      await expect(callUpload(caller)).rejects.toThrow(
        new TRPCError({ code: "FORBIDDEN", message: NO_CEPH_CREDENTIALS })
      )
    })
  })
})
