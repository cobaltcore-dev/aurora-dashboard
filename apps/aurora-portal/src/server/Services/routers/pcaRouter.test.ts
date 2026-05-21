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

const validCreateCAResponse = {
  id: "ca-new",
  project_id: TEST_PROJECT_ID,
  state: "CREATING" as const,
  configuration: {
    subject: {
      common_name: "new-ca.example.com",
    },
  },
}

const validImportCAResponse = {
  certificate_authority: validCreateCAResponse,
}

const validCreateCertificateResponse = {
  certificate: {
    id: "cert-new",
    certificate_authority_id: "ca-1",
    project_id: TEST_PROJECT_ID,
    certificate: {
      pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
      validity: {
        not_before: 1705315200,
        not_after: 1736851200,
      },
    },
    configuration: {
      validity: {
        not_before: 1705315200,
        not_after: 1736851200,
      },
    },
    csr: "-----BEGIN CERTIFICATE REQUEST-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE REQUEST-----",
  },
}

const createMockContext = (opts?: {
  noClavis?: boolean
  parseError?: boolean
  certificateParseError?: boolean
  getByIdParseError?: boolean
  getByIdCertificateParseError?: boolean
  createCAParseError?: boolean
  createCertificateParseError?: boolean
  importCAParseError?: boolean
}) => {
  const {
    noClavis = false,
    parseError = false,
    certificateParseError = false,
    getByIdParseError = false,
    getByIdCertificateParseError = false,
    createCAParseError = false,
    createCertificateParseError = false,
    importCAParseError = false,
  } = opts || {}

  const getMock = vi.fn().mockImplementation((url: string) => {
    let responseBody: unknown
    if (/\/certificates\/[^/]+$/.test(url)) {
      responseBody = getByIdCertificateParseError ? { invalid: true } : validGetByIdCertificateResponse
    } else if (url.includes("/certificates")) {
      responseBody = certificateParseError ? { invalid: true } : validCertificatesResponse
    } else if (url === "certificate-authorities") {
      responseBody = parseError ? { invalid: true } : validListResponse
    } else {
      responseBody = getByIdParseError ? { invalid: true } : validGetByIdResponse
    }

    return Promise.resolve({
      json: vi.fn().mockResolvedValue(responseBody),
    })
  })

  const postMock = vi.fn().mockImplementation((url: string) => {
    let responseBody: unknown
    if (url.includes("/certificates")) {
      responseBody = createCertificateParseError ? { invalid: true } : validCreateCertificateResponse
    } else if (url.includes(":importCertificate")) {
      responseBody = importCAParseError ? { invalid: true } : validImportCAResponse
    } else {
      responseBody = createCAParseError ? { invalid: true } : validCreateCAResponse
    }

    return Promise.resolve({
      json: vi.fn().mockResolvedValue(responseBody),
    })
  })

  const delMock = vi.fn().mockResolvedValue(undefined)

  const clavisService = {
    del: delMock,
    get: getMock,
    post: postMock,
  }

  const serviceMock = vi.fn().mockImplementation((serviceName: string) => {
    if (serviceName === "clavis" || serviceName === "pca") {
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
    __delMock: delMock,
    __getMock: getMock,
    __postMock: postMock,
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
      expect(ctx.__serviceMock).toHaveBeenCalledWith("pca")
      expect(ctx.__getMock).toHaveBeenCalledWith("certificate-authorities")
    })

    it("throws INTERNAL_SERVER_ERROR when pca service is unavailable", async () => {
      const ctx = createMockContext({ noClavis: true })
      const caller = createCaller(ctx as never)

      await expect(caller.services.pca.list({ project_id: TEST_PROJECT_ID })).rejects.toThrow(
        new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Pca service is not available",
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
      expect(ctx.__getMock).toHaveBeenCalledWith("certificate-authorities/ca-1")
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

  describe("delete", () => {
    it("deletes certificate authority for valid input", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.services.pca.delete({
        project_id: TEST_PROJECT_ID,
        certificate_authority_id: "ca-1",
      })

      expect(result).toBeUndefined()
      expect(ctx.__delMock).toHaveBeenCalledWith("certificate-authorities/ca-1")
    })

    it("throws INTERNAL_SERVER_ERROR when clavis service is unavailable", async () => {
      const ctx = createMockContext({ noClavis: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.delete({
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
      expect(ctx.__getMock).toHaveBeenCalledWith("certificate-authorities/ca-1/certificates")
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
      expect(ctx.__getMock).toHaveBeenCalledWith("certificate-authorities/ca-1/certificates/cert-1")
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

  describe("create", () => {
    it("creates certificate authority for valid input", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.services.pca.create({
        project_id: TEST_PROJECT_ID,
        configuration: {
          subject: {
            common_name: "new-ca.example.com",
          },
        },
      })

      expect(result).toEqual(validCreateCAResponse)
      expect(ctx.__postMock).toHaveBeenCalledWith("certificate-authorities", expect.any(Object))
    })

    it("throws PARSE_ERROR on invalid create response payload", async () => {
      const ctx = createMockContext({ createCAParseError: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.create({
          project_id: TEST_PROJECT_ID,
          configuration: {
            subject: {
              common_name: "new-ca.example.com",
            },
          },
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in pcaRouter.create",
        })
      )
    })
  })

  describe("createCertificate", () => {
    it("creates certificate for valid input", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.services.pca.createCertificate({
        project_id: TEST_PROJECT_ID,
        certificate_authority_id: "ca-1",
        certificate: {
          configuration: {
            validity: {
              not_before: 1705315200,
              not_after: 1736851200,
            },
          },
          csr: "-----BEGIN CERTIFICATE REQUEST-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE REQUEST-----",
        },
      })

      expect(result).toEqual(validCreateCertificateResponse.certificate)
      expect(ctx.__postMock).toHaveBeenCalledWith("certificate-authorities/ca-1/certificates", expect.any(Object))
    })

    it("throws PARSE_ERROR on invalid create certificate response payload", async () => {
      const ctx = createMockContext({ createCertificateParseError: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.createCertificate({
          project_id: TEST_PROJECT_ID,
          certificate_authority_id: "ca-1",
          certificate: {
            configuration: {
              validity: {
                not_before: 1705315200,
                not_after: 1736851200,
              },
            },
            csr: "-----BEGIN CERTIFICATE REQUEST-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE REQUEST-----",
          },
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in pcaRouter.createCertificate",
        })
      )
    })
  })

  describe("import", () => {
    it("imports certificate for valid input", async () => {
      const ctx = createMockContext()
      const caller = createCaller(ctx as never)

      const result = await caller.services.pca.import({
        project_id: TEST_PROJECT_ID,
        certificate_authority_id: "ca-1",
        imported_certificate_chain:
          "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
      })

      expect(result).toEqual(validImportCAResponse.certificate_authority)
      expect(ctx.__postMock).toHaveBeenCalledWith("certificate-authorities/ca-1:importCertificate", expect.any(Object))
      const [, request] = ctx.__postMock.mock.calls[ctx.__postMock.mock.calls.length - 1]
      expect(JSON.parse(request.body)).toEqual({
        imported_certificate_chain:
          "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
      })
    })

    it("throws PARSE_ERROR on invalid import response payload", async () => {
      const ctx = createMockContext({ importCAParseError: true })
      const caller = createCaller(ctx as never)

      await expect(
        caller.services.pca.import({
          project_id: TEST_PROJECT_ID,
          certificate_authority_id: "ca-1",
          imported_certificate_chain:
            "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
        })
      ).rejects.toThrow(
        new TRPCError({
          code: "PARSE_ERROR",
          message: "Failed to parse response in pcaRouter.import",
        })
      )
    })
  })
})
