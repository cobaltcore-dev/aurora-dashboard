import { describe, it, expect, vi, beforeEach } from "vitest"
import { TRPCError } from "@trpc/server"
import { auroraRouter, createCallerFactory } from "../../trpc"
import { pcaRouter } from "./pcaRouter"

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

const validGetByIdResponse = {
  certificate_authority: {
    id: "ca-1",
    project_id: TEST_PROJECT_ID,
    state: "READY" as const,
    configuration: {
      subject: {
        common_name: "ca.example.com",
      },
    },
  },
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

const validGetByIdCertificateResponse = {
  certificate: validCertificatesResponse.certificates[0],
}

const createMockContext = (opts?: {
  noClavis?: boolean
  parseError?: boolean
  certificateParseError?: boolean
  getByIdParseError?: boolean
  getByIdCertificateParseError?: boolean
}) => {
  const {
    noClavis = false,
    parseError = false,
    certificateParseError = false,
    getByIdParseError = false,
    getByIdCertificateParseError = false,
  } = opts || {}

  const getMock = vi.fn().mockImplementation((url: string) => {
    let responseBody: unknown
    if (/\/certificates\/[^/]+$/.test(url)) {
      responseBody = getByIdCertificateParseError ? { invalid: true } : validGetByIdCertificateResponse
    } else if (url.includes("/certificates")) {
      responseBody = certificateParseError ? { invalid: true } : validCertificatesResponse
    } else if (url === "v1/certificate-authorities") {
      responseBody = parseError ? { invalid: true } : validListResponse
    } else {
      responseBody = getByIdParseError ? { invalid: true } : validGetByIdResponse
    }

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
    services: auroraRouter({
      pca: pcaRouter,
    }),
  })
)

describe("pcaRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("list", () => {
    it("returns certificate authorities for valid response", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.services.pca.list({ project_id: TEST_PROJECT_ID })

      expect(result).toEqual(validListResponse.certificate_authorities)
      expect(ctx.__serviceMock).toHaveBeenCalledWith("clavis")
      expect(ctx.__getMock).toHaveBeenCalledWith("v1/certificate-authorities")
    })

    it("throws INTERNAL_SERVER_ERROR when clavis service is unavailable", async () => {
      const ctx = createMockContext({ noClavis: true })
      const caller = createCaller(ctx as never)

      await expect(caller.services.pca.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Clavis service is not available",
        })
      )
    })

    it("throws PARSE_ERROR on invalid Clavis response payload", async () => {
      const ctx = createMockContext({ parseError: true })
      const caller = createCaller(ctx as never)

      await expect(caller.services.pca.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in pcaRouter.list",
        })
      )
    })
  })

  describe("getById", () => {
    it("returns certificate authority for valid response", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.services.pca.getById({
        project_id: TEST_PROJECT_ID,
        certificate_authority_id: "ca-1",
      })

      expect(result).toEqual(validGetByIdResponse.certificate_authority)
      expect(ctx.__getMock).toHaveBeenCalledWith("v1/certificate-authorities/ca-1")
    })

    it("throws INTERNAL_SERVER_ERROR when clavis service is unavailable", async () => {
      const ctx = createMockContext({ noClavis: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.getById({
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

    it("throws PARSE_ERROR on invalid Clavis response payload", async () => {
      const ctx = createMockContext({ getByIdParseError: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.getById({
          project_id: TEST_PROJECT_ID,
          certificate_authority_id: "ca-1",
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in pcaRouter.getById",
        })
      )
    })
  })

  describe("listCertificates", () => {
    it("returns certificates for a certificate authority", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.services.pca.listCertificates({
        project_id: TEST_PROJECT_ID,
        certificate_authority_id: "ca-1",
      })

      expect(result).toEqual(validCertificatesResponse.certificates)
      expect(ctx.__getMock).toHaveBeenCalledWith("v1/certificate-authorities/ca-1/certificates")
    })

    it("throws INTERNAL_SERVER_ERROR when clavis service is unavailable", async () => {
      const ctx = createMockContext({ noClavis: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.listCertificates({
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
        caller.services.pca.listCertificates({
          project_id: TEST_PROJECT_ID,
          certificate_authority_id: "ca-1",
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in pcaRouter.listCertificates",
        })
      )
    })
  })

  describe("getByIdCertificate", () => {
    it("returns certificate details for valid response", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.services.pca.getByIdCertificate({
        project_id: TEST_PROJECT_ID,
        certificate_authority_id: "ca-1",
        certificate_id: "cert-1",
      })

      expect(result).toEqual(validGetByIdCertificateResponse.certificate)
      expect(ctx.__getMock).toHaveBeenCalledWith("v1/certificate-authorities/ca-1/certificates/cert-1")
    })

    it("throws INTERNAL_SERVER_ERROR when clavis service is unavailable", async () => {
      const ctx = createMockContext({ noClavis: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.getByIdCertificate({
          project_id: TEST_PROJECT_ID,
          certificate_authority_id: "ca-1",
          certificate_id: "cert-1",
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Clavis service is not available",
        })
      )
    })

    it("throws PARSE_ERROR on invalid certificate details response payload", async () => {
      const ctx = createMockContext({ getByIdCertificateParseError: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.getByIdCertificate({
          project_id: TEST_PROJECT_ID,
          certificate_authority_id: "ca-1",
          certificate_id: "cert-1",
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in pcaRouter.getByIdCertificate",
        })
      )
    })
  })
})
