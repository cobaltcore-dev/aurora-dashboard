import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { auroraRouter, createCallerFactory } from "../../trpc"
import { clavisRouter } from "./pcaRouter"

const TEST_PROJECT_ID = "project-1"

const validListResponse = {
  certificate_authorities: [
    {
      id: "ca-1",
      project_id: TEST_PROJECT_ID,
      state: "CREATING" as const,
      configuration: {
        subject: {
          common_name: "ca.example.com",
        },
      },
    },
  ],
}

const validCertificatesResponse = {
  certificates: [
    {
      id: "cert-1",
      certificate_authority_id: "ca-1",
      project_id: TEST_PROJECT_ID,
      certificate: {
        pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
        validity: {
          not_before: 1705315200,
          not_after: 1736851200,
        },
      },
      certificate_chain: {
        certificates: [{ pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----" }],
        pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
      },
      configuration: {
        validity: {
          not_before: 1705315200,
          not_after: 1736851200,
        },
      },
      csr: "-----BEGIN CERTIFICATE REQUEST-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE REQUEST-----",
    },
  ],
}

const createMockContext = (opts?: {
  noClavis?: boolean
  usePcaFallback?: boolean
  parseError?: boolean
  certificateParseError?: boolean
}) => {
  const { noClavis = false, usePcaFallback = false, parseError = false, certificateParseError = false } = opts || {}

  const getMock = vi.fn().mockImplementation((url: string) => {
    const responseBody = url.includes("/certificates")
      ? certificateParseError
        ? { invalid: true }
        : validCertificatesResponse
      : parseError
        ? { invalid: true }
        : validListResponse

    return Promise.resolve({
      json: vi.fn().mockResolvedValue(responseBody),
    })
  })

  const clavisService = {
    get: getMock,
  }

  const serviceMock = vi.fn().mockImplementation((serviceName: string) => {
    if (serviceName === "clavis") {
      return noClavis ? null : clavisService
    }
    if (serviceName === "pca") {
      return usePcaFallback ? clavisService : null
    }
    return null
  })

  const scopedSession = {
    service: serviceMock,
  }

  return {
    validateSession: vi.fn().mockReturnValue(true),
    rescopeSession: vi.fn().mockResolvedValue(scopedSession),
    createSession: vi.fn(),
    terminateSession: vi.fn(),
    getMultipartData: vi.fn(),
    __serviceMock: serviceMock,
    __getMock: getMock,
  }
}

const createCaller = createCallerFactory(
  auroraRouter({
    clavis: auroraRouter({
      ca: clavisRouter,
    }),
  })
)

describe("clavisRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("list", () => {
    it("returns certificate authorities for valid response", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.clavis.ca.list({ project_id: TEST_PROJECT_ID })

      expect(result).toEqual(validListResponse.certificate_authorities)
      expect(ctx.__serviceMock).toHaveBeenCalledWith("clavis")
      expect(ctx.__getMock).toHaveBeenCalledWith("v1/certificate-authorities")
    })

    it("falls back to pca service when clavis is unavailable", async () => {
      const ctx = createMockContext({ noClavis: true, usePcaFallback: true })
      const caller = createCaller(ctx as never)

      const result = await caller.clavis.ca.list({ project_id: TEST_PROJECT_ID })

      expect(result).toEqual(validListResponse.certificate_authorities)
      expect(ctx.__serviceMock).toHaveBeenNthCalledWith(1, "clavis")
      expect(ctx.__serviceMock).toHaveBeenNthCalledWith(2, "pca")
    })

    it("throws INTERNAL_SERVER_ERROR when both clavis and pca services are unavailable", async () => {
      const ctx = createMockContext({ noClavis: true, usePcaFallback: false })
      const caller = createCaller(ctx as never)

      await expect(caller.clavis.ca.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Clavis service is not available",
        })
      )
    })

    it("throws PARSE_ERROR on invalid Clavis response payload", async () => {
      const ctx = createMockContext({ parseError: true })
      const caller = createCaller(ctx as never)

      await expect(caller.clavis.ca.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in clavisRouter.list",
        })
      )
    })
  })

  describe("listCertificates", () => {
    it("returns certificates for a certificate authority", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.clavis.ca.listCertificates({
        project_id: TEST_PROJECT_ID,
        certificate_authority_id: "ca-1",
      })

      expect(result).toEqual(validCertificatesResponse.certificates)
      expect(ctx.__getMock).toHaveBeenCalledWith("v1/certificate-authorities/ca-1/certificates")
    })

    it("falls back to pca service when clavis is unavailable", async () => {
      const ctx = createMockContext({ noClavis: true, usePcaFallback: true })
      const caller = createCaller(ctx as never)

      const result = await caller.clavis.ca.listCertificates({
        project_id: TEST_PROJECT_ID,
        certificate_authority_id: "ca-1",
      })

      expect(result).toEqual(validCertificatesResponse.certificates)
      expect(ctx.__serviceMock).toHaveBeenNthCalledWith(1, "clavis")
      expect(ctx.__serviceMock).toHaveBeenNthCalledWith(2, "pca")
    })

    it("throws INTERNAL_SERVER_ERROR when both clavis and pca services are unavailable", async () => {
      const ctx = createMockContext({ noClavis: true, usePcaFallback: false })
      const caller = createCaller(ctx as never)

      await expect(
        caller.clavis.ca.listCertificates({
          project_id: TEST_PROJECT_ID,
          certificate_authority_id: "ca-1",
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Clavis service is not available",
        })
      )
    })

    it("throws PARSE_ERROR on invalid certificate response payload", async () => {
      const ctx = createMockContext({ certificateParseError: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.clavis.ca.listCertificates({
          project_id: TEST_PROJECT_ID,
          certificate_authority_id: "ca-1",
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in clavisRouter.listCertificates",
        })
      )
    })
  })
})
