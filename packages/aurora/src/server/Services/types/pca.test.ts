import { describe, it, expect } from "vitest"
import {
  CertificateAuthoritiesListSchema,
  CertificateAuthorityCreateSchema,
  CertificateAuthorityImportInputSchema,
  CertificateAuthoritySchema,
  CertificateConfigurationSchema,
  CertificateAuthorityIdInputSchema,
  CertificateIdInputSchema,
  CertificateSchema,
  CertificatesListSchema,
  CreateCertificateInputSchema,
} from "./pca"
import { omit } from "@/server/helpers/object"

describe("PCA (Private Certificate Authority) Schema Validation", () => {
  const minimalValidSubject = {
    common_name: "example.com",
  }

  const minimalValidCA = {
    id: "ca-123",
    project_id: "project-1",
    state: "CREATING" as const,
    configuration: {
      subject: minimalValidSubject,
    },
  }

  const minimalValidReadyCA = {
    id: "ca-456",
    project_id: "project-1",
    state: "READY" as const,
    configuration: {
      subject: minimalValidSubject,
    },
    certificate: {
      pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
      validity: {
        not_before: 1705315200,
        not_after: 1736851200,
      },
    },
    certificate_chain: {
      certificates: [
        {
          pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
        },
      ],
      pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
    },
    csr: "-----BEGIN CERTIFICATE REQUEST-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE REQUEST-----",
  }

  const completeValidSubject = {
    additional_attribute: [
      {
        key: [1, 2, 3, 4],
        value: "custom-value",
      },
    ],
    common_name: "ca.example.com",
    country: ["DE"],
    locality: ["Berlin"],
    organization: ["Example Org"],
    organizational_unit: ["IT Security"],
    postal_code: ["10115"],
    province: ["Berlin"],
    serial_number: "12345678",
    street_address: ["Example Street 1"],
  }

  const completeValidCA = {
    id: "ca-789",
    project_id: "project-1",
    state: "READY" as const,
    configuration: {
      subject: completeValidSubject,
    },
    certificate: {
      pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
      validity: {
        not_before: 1705315200,
        not_after: 1736851200,
      },
    },
    certificate_chain: {
      certificates: [
        {
          pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
        },
        {
          pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...XYZ789==\n-----END CERTIFICATE-----",
        },
      ],
      pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...XYZ789==\n-----END CERTIFICATE-----",
    },
    csr: "-----BEGIN CERTIFICATE REQUEST-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE REQUEST-----",
    imported_certificate_chain: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
  }

  describe("CAStateSchema", () => {
    it("should validate CREATING state", () => {
      expect(CertificateAuthoritySchema.safeParse({ ...minimalValidCA, state: "CREATING" }).success).toBe(true)
    })

    it("should validate AWAITING_CERTIFICATE state", () => {
      expect(CertificateAuthoritySchema.safeParse({ ...minimalValidCA, state: "AWAITING_CERTIFICATE" }).success).toBe(
        true
      )
    })

    it("should validate READY state", () => {
      expect(CertificateAuthoritySchema.safeParse({ ...minimalValidCA, state: "READY" }).success).toBe(true)
    })

    it("should validate FAILED state", () => {
      expect(CertificateAuthoritySchema.safeParse({ ...minimalValidCA, state: "FAILED" }).success).toBe(true)
    })

    it("should validate UNEXPECTED state", () => {
      expect(CertificateAuthoritySchema.safeParse({ ...minimalValidCA, state: "UNEXPECTED" }).success).toBe(true)
    })

    it("should reject invalid state", () => {
      expect(CertificateAuthoritySchema.safeParse({ ...minimalValidCA, state: "INVALID" }).success).toBe(false)
      expect(CertificateAuthoritySchema.safeParse({ ...minimalValidCA, state: "creating" }).success).toBe(false)
      expect(CertificateAuthoritySchema.safeParse({ ...minimalValidCA, state: "" }).success).toBe(false)
    })
  })

  describe("CertificateAuthoritySubjectSchema", () => {
    it("should validate minimal subject with only common_name", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com" } },
        }).success
      ).toBe(true)
    })

    it("should validate complete subject with all fields", () => {
      expect(
        CertificateAuthoritySchema.safeParse({ ...minimalValidCA, configuration: { subject: completeValidSubject } })
          .success
      ).toBe(true)
    })

    it("should require common_name", () => {
      const result = CertificateAuthoritySchema.safeParse({
        ...minimalValidCA,
        configuration: { subject: { country: ["US"] } },
      })
      expect(result.success).toBe(false)
    })

    it("should validate common_name as string", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "example.com" } },
        }).success
      ).toBe(true)
    })

    it("should validate country as array of strings", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com", country: ["DE", "US"] } },
        }).success
      ).toBe(true)
    })

    it("should validate locality as array of strings", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com", locality: ["Berlin"] } },
        }).success
      ).toBe(true)
    })

    it("should validate organization as array of strings", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com", organization: ["Example Corp"] } },
        }).success
      ).toBe(true)
    })

    it("should validate organizational_unit as array of strings", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com", organizational_unit: ["IT"] } },
        }).success
      ).toBe(true)
    })

    it("should validate postal_code as array of strings", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com", postal_code: ["10115"] } },
        }).success
      ).toBe(true)
    })

    it("should validate province as array of strings", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com", province: ["Berlin"] } },
        }).success
      ).toBe(true)
    })

    it("should validate serial_number as string", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com", serial_number: "SN123456" } },
        }).success
      ).toBe(true)
    })

    it("should validate street_address as array of strings", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: { subject: { common_name: "test.com", street_address: ["Example Street 1"] } },
        }).success
      ).toBe(true)
    })

    it("should validate additional_attribute as array", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: {
            subject: {
              common_name: "test.com",
              additional_attribute: [
                {
                  key: [1, 2, 3, 4],
                  value: "custom-value",
                },
              ],
            },
          },
        }).success
      ).toBe(true)
    })

    it("should validate multiple additional_attributes", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: {
            subject: {
              common_name: "test.com",
              additional_attribute: [
                { key: [1, 2, 3, 4], value: "value1" },
                { key: [1, 2, 3, 5], value: "value2" },
              ],
            },
          },
        }).success
      ).toBe(true)
    })

    it("should reject additional_attribute without key", () => {
      const result = CertificateAuthoritySchema.safeParse({
        ...minimalValidCA,
        configuration: {
          subject: {
            common_name: "test.com",
            additional_attribute: [{ value: "custom-value" }],
          },
        },
      })
      expect(result.success).toBe(false)
    })

    it("should reject additional_attribute without value", () => {
      const result = CertificateAuthoritySchema.safeParse({
        ...minimalValidCA,
        configuration: {
          subject: {
            common_name: "test.com",
            additional_attribute: [{ key: [1, 2, 3, 4] }],
          },
        },
      })
      expect(result.success).toBe(false)
    })
  })

  describe("CertificateAuthorityCertificateSchema", () => {
    it("should validate certificate with PEM and validity", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          certificate: {
            pem: "-----BEGIN CERTIFICATE-----\n...",
            validity: {
              not_before: 1705315200,
              not_after: 1736851200,
            },
          },
        }).success
      ).toBe(true)
    })

    it("should require PEM field", () => {
      const result = CertificateAuthoritySchema.safeParse({
        ...minimalValidCA,
        certificate: {
          validity: {
            not_before: 1705315200,
            not_after: 1736851200,
          },
        },
      })
      expect(result.success).toBe(false)
    })

    it("should require validity field", () => {
      const result = CertificateAuthoritySchema.safeParse({
        ...minimalValidCA,
        certificate: {
          pem: "-----BEGIN CERTIFICATE-----\n...",
        },
      })
      expect(result.success).toBe(false)
    })

    it("should require not_before as integer", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          certificate: {
            pem: "-----BEGIN CERTIFICATE-----\n...",
            validity: {
              not_before: 1705315200.5,
              not_after: 1736851200,
            },
          },
        }).success
      ).toBe(false)
    })

    it("should require not_after as integer", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          certificate: {
            pem: "-----BEGIN CERTIFICATE-----\n...",
            validity: {
              not_before: 1705315200,
              not_after: "1705315200",
            },
          },
        }).success
      ).toBe(false)
    })

    it("should accept Unix timestamp integers for validity dates", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          certificate: {
            pem: "-----BEGIN CERTIFICATE-----\n...",
            validity: {
              not_before: 0,
              not_after: 2147483647,
            },
          },
        }).success
      ).toBe(true)
    })
  })

  describe("CertificateAuthorityCertificateChainSchema", () => {
    it("should validate certificate chain with single certificate", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          certificate_chain: {
            certificates: [
              {
                pem: "-----BEGIN CERTIFICATE-----\n...",
              },
            ],
            pem: "-----BEGIN CERTIFICATE-----\n...",
          },
        }).success
      ).toBe(true)
    })

    it("should validate certificate chain with multiple certificates", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          certificate_chain: {
            certificates: [
              { pem: "-----BEGIN CERTIFICATE-----\n..." },
              { pem: "-----BEGIN CERTIFICATE-----\n..." },
              { pem: "-----BEGIN CERTIFICATE-----\n..." },
            ],
            pem: "-----BEGIN CERTIFICATE-----\n...\n-----BEGIN CERTIFICATE-----\n...",
          },
        }).success
      ).toBe(true)
    })

    it("should require certificates array", () => {
      const result = CertificateAuthoritySchema.safeParse({
        ...minimalValidCA,
        certificate_chain: {
          pem: "-----BEGIN CERTIFICATE-----\n...",
        },
      })
      expect(result.success).toBe(false)
    })

    it("should require pem field", () => {
      const result = CertificateAuthoritySchema.safeParse({
        ...minimalValidCA,
        certificate_chain: {
          certificates: [
            {
              pem: "-----BEGIN CERTIFICATE-----\n...",
            },
          ],
        },
      })
      expect(result.success).toBe(false)
    })

    it("should validate empty certificates array", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          certificate_chain: {
            certificates: [],
            pem: "-----BEGIN CERTIFICATE-----\n...",
          },
        }).success
      ).toBe(true)
    })
  })

  describe("CertificateAuthoritySchema", () => {
    it("should validate minimal valid CA in CREATING state", () => {
      expect(CertificateAuthoritySchema.safeParse(minimalValidCA).success).toBe(true)
    })

    it("should validate complete valid CA in READY state", () => {
      expect(CertificateAuthoritySchema.safeParse(completeValidCA).success).toBe(true)
    })

    it("should reject CA without required fields", () => {
      expect(CertificateAuthoritySchema.safeParse({ id: "ca-123" }).success).toBe(false)
    })

    it("should require id", () => {
      const { ...withoutId } = omit(minimalValidCA, "id")
      expect(CertificateAuthoritySchema.safeParse(withoutId).success).toBe(false)
    })

    it("should require project_id", () => {
      const { ...withoutProjectId } = omit(minimalValidCA, "project_id")
      expect(CertificateAuthoritySchema.safeParse(withoutProjectId).success).toBe(false)
    })

    it("should require state", () => {
      const { ...withoutState } = omit(minimalValidCA, "state")
      expect(CertificateAuthoritySchema.safeParse(withoutState).success).toBe(false)
    })

    it("should allow configuration to be omitted", () => {
      const { ...withoutConfiguration } = omit(minimalValidCA, "configuration")
      expect(CertificateAuthoritySchema.safeParse(withoutConfiguration).success).toBe(true)
    })

    it("should require configuration.subject", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          configuration: {},
        }).success
      ).toBe(false)
    })

    it("should allow certificate to be omitted in CREATING state", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          state: "CREATING" as const,
        }).success
      ).toBe(true)
    })

    it("should allow certificate to be omitted in AWAITING_CERTIFICATE state", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          state: "AWAITING_CERTIFICATE" as const,
        }).success
      ).toBe(true)
    })

    it("should allow certificate_chain to be omitted for incomplete CAs", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          state: "CREATING" as const,
        }).success
      ).toBe(true)
    })

    it("should allow csr to be omitted", () => {
      expect(CertificateAuthoritySchema.safeParse(minimalValidCA).success).toBe(true)
    })

    it("should allow imported_certificate_chain to be omitted", () => {
      expect(CertificateAuthoritySchema.safeParse(minimalValidCA).success).toBe(true)
    })

    it("should validate certificate and certificate_chain together in READY state", () => {
      expect(CertificateAuthoritySchema.safeParse(minimalValidReadyCA).success).toBe(true)
    })

    it("should validate CA in FAILED state with minimal fields", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          state: "FAILED" as const,
        }).success
      ).toBe(true)
    })

    it("should validate CA in UNEXPECTED state with minimal fields", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidCA,
          state: "UNEXPECTED" as const,
        }).success
      ).toBe(true)
    })

    it("should validate CA with all optional fields populated", () => {
      expect(CertificateAuthoritySchema.safeParse(completeValidCA).success).toBe(true)
    })

    it("should validate CA lifecycle progression: CREATING -> AWAITING_CERTIFICATE", () => {
      const creatingCA = {
        ...minimalValidCA,
        state: "CREATING" as const,
      }
      const awaitingCA = {
        ...minimalValidCA,
        state: "AWAITING_CERTIFICATE" as const,
        csr: "-----BEGIN CERTIFICATE REQUEST-----\n...",
      }

      expect(CertificateAuthoritySchema.safeParse(creatingCA).success).toBe(true)
      expect(CertificateAuthoritySchema.safeParse(awaitingCA).success).toBe(true)
    })

    it("should validate CA lifecycle progression: AWAITING_CERTIFICATE -> READY", () => {
      expect(CertificateAuthoritySchema.safeParse(minimalValidReadyCA).success).toBe(true)
    })

    it("should validate externally signed CA with imported_certificate_chain", () => {
      expect(
        CertificateAuthoritySchema.safeParse({
          ...minimalValidReadyCA,
          imported_certificate_chain: "-----BEGIN CERTIFICATE-----\n...",
        }).success
      ).toBe(true)
    })
  })

  describe("CertificateAuthoritiesListSchema", () => {
    it("should validate list response with single CA", () => {
      expect(
        CertificateAuthoritiesListSchema.safeParse({
          certificate_authorities: [minimalValidCA],
        }).success
      ).toBe(true)
    })

    it("should validate list response with multiple CAs", () => {
      expect(
        CertificateAuthoritiesListSchema.safeParse({
          certificate_authorities: [minimalValidCA, minimalValidReadyCA, completeValidCA],
        }).success
      ).toBe(true)
    })

    it("should validate empty certificate_authorities array", () => {
      expect(
        CertificateAuthoritiesListSchema.safeParse({
          certificate_authorities: [],
        }).success
      ).toBe(true)
    })

    it("should reject list response without certificate_authorities key", () => {
      expect(CertificateAuthoritiesListSchema.safeParse({}).success).toBe(false)
    })

    it("should reject list response with null certificate_authorities", () => {
      expect(
        CertificateAuthoritiesListSchema.safeParse({
          certificate_authorities: null,
        }).success
      ).toBe(false)
    })

    it("should reject list response with invalid CA in array", () => {
      const result = CertificateAuthoritiesListSchema.safeParse({
        certificate_authorities: [{ id: "ca-123" }],
      })
      expect(result.success).toBe(false)
    })

    it("should validate list with mixed CA states", () => {
      const creatingCA = { ...minimalValidCA, state: "CREATING" as const }
      const awaitingCA = { ...minimalValidCA, id: "ca-2", state: "AWAITING_CERTIFICATE" as const }
      const readyCA = { ...minimalValidReadyCA, id: "ca-3" }
      const failedCA = { ...minimalValidCA, id: "ca-4", state: "FAILED" as const }

      expect(
        CertificateAuthoritiesListSchema.safeParse({
          certificate_authorities: [creatingCA, awaitingCA, readyCA, failedCA],
        }).success
      ).toBe(true)
    })

    it("should validate list with CAs in various completion states", () => {
      const incompleteCAs = [
        { ...minimalValidCA, id: "ca-1", state: "CREATING" as const },
        {
          ...minimalValidCA,
          id: "ca-2",
          state: "AWAITING_CERTIFICATE" as const,
          csr: "-----BEGIN CERTIFICATE REQUEST-----\n...",
        },
      ]
      const completeCAs = [minimalValidReadyCA, completeValidCA]

      expect(
        CertificateAuthoritiesListSchema.safeParse({
          certificate_authorities: [...incompleteCAs, ...completeCAs],
        }).success
      ).toBe(true)
    })

    it("should validate real-world list response scenario", () => {
      const realWorldResponse = {
        certificate_authorities: [
          {
            id: "pca-prod-001",
            project_id: "prod-project",
            state: "READY" as const,
            configuration: {
              subject: {
                common_name: "prod-ca.example.com",
                country: ["DE"],
                organization: ["Example Corp"],
              },
            },
            certificate: {
              pem: "-----BEGIN CERTIFICATE-----\n...",
              validity: {
                not_before: 1705315200,
                not_after: 1736851200,
              },
            },
            certificate_chain: {
              certificates: [{ pem: "-----BEGIN CERTIFICATE-----\n..." }, { pem: "-----BEGIN CERTIFICATE-----\n..." }],
              pem: "-----BEGIN CERTIFICATE-----\n...",
            },
            csr: "-----BEGIN CERTIFICATE REQUEST-----\n...",
          },
          {
            id: "pca-staging-001",
            project_id: "staging-project",
            state: "CREATING" as const,
            configuration: {
              subject: {
                common_name: "staging-ca.example.com",
              },
            },
          },
        ],
      }

      expect(CertificateAuthoritiesListSchema.safeParse(realWorldResponse).success).toBe(true)
    })
  })

  describe("CertificateAuthorityIdInputSchema", () => {
    it("should validate with required project_id and certificate_authority_id", () => {
      expect(
        CertificateAuthorityIdInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
        }).success
      ).toBe(true)
    })

    it("should reject without certificate_authority_id", () => {
      expect(
        CertificateAuthorityIdInputSchema.safeParse({
          project_id: "project-1",
        }).success
      ).toBe(false)
    })

    it("should reject without project_id", () => {
      expect(
        CertificateAuthorityIdInputSchema.safeParse({
          certificate_authority_id: "ca-123",
        }).success
      ).toBe(false)
    })

    it("should reject with empty certificate_authority_id", () => {
      expect(
        CertificateAuthorityIdInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "",
        }).success
      ).toBe(false)
    })

    it("should require certificate_authority_id as non-empty string", () => {
      expect(
        CertificateAuthorityIdInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-456",
        }).success
      ).toBe(true)
    })
  })

  describe("CertificateAuthorityImportInputSchema", () => {
    it("should validate import input with all required fields", () => {
      expect(
        CertificateAuthorityImportInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
          imported_certificate_chain:
            "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
        }).success
      ).toBe(true)
    })

    it("should reject import input without imported_certificate_chain", () => {
      expect(
        CertificateAuthorityImportInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
        }).success
      ).toBe(false)
    })

    it("should reject import input with empty imported_certificate_chain", () => {
      expect(
        CertificateAuthorityImportInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
          imported_certificate_chain: "",
        }).success
      ).toBe(false)
    })
  })

  describe("CertificateAuthorityCreateSchema", () => {
    it("should validate create input with subject.common_name", () => {
      expect(
        CertificateAuthorityCreateSchema.safeParse({
          configuration: {
            subject: { common_name: "ca.example.com" },
          },
        }).success
      ).toBe(true)
    })

    it("should reject create input without subject.common_name", () => {
      expect(
        CertificateAuthorityCreateSchema.safeParse({
          configuration: {
            subject: {},
          },
        }).success
      ).toBe(false)
    })

    it("should reject create input without configuration", () => {
      expect(CertificateAuthorityCreateSchema.safeParse({}).success).toBe(false)
    })
  })

  describe("CertificateConfigurationSchema", () => {
    it("should validate certificate configuration payload", () => {
      expect(
        CertificateConfigurationSchema.safeParse({
          validity: {
            not_after: 1736851200,
            not_before: 1705315200,
          },
        }).success
      ).toBe(true)
    })

    it("should reject certificate configuration payload without validity", () => {
      expect(CertificateConfigurationSchema.safeParse({}).success).toBe(false)
    })
  })

  describe("CreateCertificateInputSchema", () => {
    it("should validate create certificate input", () => {
      expect(
        CreateCertificateInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
          configuration: {
            validity: {
              not_after: 1736851200,
              not_before: 1705315200,
            },
          },
          csr: "-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----",
        }).success
      ).toBe(true)
    })

    it("should reject with empty certificate_authority_id", () => {
      expect(
        CreateCertificateInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "",
          configuration: {
            validity: {
              not_after: 1736851200,
              not_before: 1705315200,
            },
          },
          csr: "-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----",
        }).success
      ).toBe(false)
    })

    it("should reject without certificate_authority_id", () => {
      expect(
        CreateCertificateInputSchema.safeParse({
          project_id: "project-1",
          configuration: {
            validity: {
              not_after: 1736851200,
              not_before: 1705315200,
            },
          },
          csr: "-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----",
        }).success
      ).toBe(false)
    })

    it("should reject with empty csr", () => {
      expect(
        CreateCertificateInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
          configuration: {
            validity: {
              not_after: 1736851200,
              not_before: 1705315200,
            },
          },
          csr: "",
        }).success
      ).toBe(false)
    })

    it("should reject without csr", () => {
      expect(
        CreateCertificateInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
          configuration: {
            validity: {
              not_after: 1736851200,
              not_before: 1705315200,
            },
          },
        }).success
      ).toBe(false)
    })

    it("should reject without project_id", () => {
      expect(
        CreateCertificateInputSchema.safeParse({
          certificate_authority_id: "ca-123",
          configuration: {
            validity: {
              not_after: 1736851200,
              not_before: 1705315200,
            },
          },
          csr: "-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----",
        }).success
      ).toBe(false)
    })

    it("should reject without configuration", () => {
      expect(
        CreateCertificateInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
          csr: "-----BEGIN CERTIFICATE REQUEST-----\n...\n-----END CERTIFICATE REQUEST-----",
        }).success
      ).toBe(false)
    })
  })

  describe("CertificateIdInputSchema", () => {
    it("should validate with required project_id, certificate_authority_id and certificate_id", () => {
      expect(
        CertificateIdInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
          certificate_id: "cert-123",
        }).success
      ).toBe(true)
    })

    it("should reject without certificate_id", () => {
      expect(
        CertificateIdInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
        }).success
      ).toBe(false)
    })

    it("should reject with empty certificate_id", () => {
      expect(
        CertificateIdInputSchema.safeParse({
          project_id: "project-1",
          certificate_authority_id: "ca-123",
          certificate_id: "",
        }).success
      ).toBe(false)
    })
  })

  describe("CertificateSchema", () => {
    const minimalValidCertificate = {
      id: "cert-123",
      certificate_authority_id: "ca-123",
      project_id: "project-1",
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
    }

    const completeValidCertificate = {
      id: "cert-456",
      certificate_authority_id: "ca-123",
      project_id: "project-1",
      certificate: {
        pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----",
        validity: {
          not_before: 1705315200,
          not_after: 1736851200,
        },
      },
      certificate_chain: {
        certificates: [
          { pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----" },
          { pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...XYZ789==\n-----END CERTIFICATE-----" },
        ],
        pem: "-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE-----\n-----BEGIN CERTIFICATE-----\nMIIBkTCB+wIJAKHHC...XYZ789==\n-----END CERTIFICATE-----",
      },
      configuration: {
        validity: {
          not_before: 1705315200,
          not_after: 1736851200,
        },
      },
      csr: "-----BEGIN CERTIFICATE REQUEST-----\nMIIBkTCB+wIJAKHHC...ABC123==\n-----END CERTIFICATE REQUEST-----",
    }

    it("should validate minimal valid certificate", () => {
      expect(CertificateSchema.safeParse(minimalValidCertificate).success).toBe(true)
    })

    it("should validate complete valid certificate with all fields", () => {
      expect(CertificateSchema.safeParse(completeValidCertificate).success).toBe(true)
    })

    it("should require id", () => {
      const result = CertificateSchema.safeParse(omit(minimalValidCertificate, "id"))
      expect(result.success).toBe(false)
    })

    it("should require certificate_authority_id", () => {
      const result = CertificateSchema.safeParse(omit(minimalValidCertificate, "certificate_authority_id"))
      expect(result.success).toBe(false)
    })

    it("should require project_id", () => {
      const result = CertificateSchema.safeParse(omit(minimalValidCertificate, "project_id"))
      expect(result.success).toBe(false)
    })

    it("should allow certificate object to be omitted", () => {
      const result = CertificateSchema.safeParse(omit(minimalValidCertificate, "certificate"))
      expect(result.success).toBe(true)
    })

    it("should allow configuration object to be omitted", () => {
      const result = CertificateSchema.safeParse(omit(minimalValidCertificate, "configuration"))
      expect(result.success).toBe(true)
    })

    it("should allow certificate_chain to be omitted", () => {
      expect(CertificateSchema.safeParse(minimalValidCertificate).success).toBe(true)
    })

    it("should allow csr to be omitted", () => {
      expect(CertificateSchema.safeParse(minimalValidCertificate).success).toBe(true)
    })

    it("should validate certificate_chain with multiple certificates", () => {
      expect(CertificateSchema.safeParse(completeValidCertificate).success).toBe(true)
    })

    it("should validate certificate with Unix timestamp validity dates", () => {
      expect(
        CertificateSchema.safeParse({
          ...minimalValidCertificate,
          certificate: {
            pem: "-----BEGIN CERTIFICATE-----\n...",
            validity: {
              not_before: 0,
              not_after: 2147483647,
            },
          },
        }).success
      ).toBe(true)
    })
  })

  describe("CertificatesListSchema", () => {
    const validCertificate = {
      id: "cert-123",
      certificate_authority_id: "ca-123",
      project_id: "project-1",
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
    }

    it("should validate list response with single certificate", () => {
      expect(
        CertificatesListSchema.safeParse({
          certificates: [validCertificate],
        }).success
      ).toBe(true)
    })

    it("should validate list response with multiple certificates", () => {
      expect(
        CertificatesListSchema.safeParse({
          certificates: [
            { ...validCertificate, id: "cert-1" },
            { ...validCertificate, id: "cert-2" },
            { ...validCertificate, id: "cert-3" },
          ],
        }).success
      ).toBe(true)
    })

    it("should validate empty certificates array", () => {
      expect(
        CertificatesListSchema.safeParse({
          certificates: [],
        }).success
      ).toBe(true)
    })

    it("should reject list response without certificates key", () => {
      expect(CertificatesListSchema.safeParse({}).success).toBe(false)
    })

    it("should reject list response with null certificates", () => {
      expect(
        CertificatesListSchema.safeParse({
          certificates: null,
        }).success
      ).toBe(false)
    })

    it("should reject list response with invalid certificate in array", () => {
      const result = CertificatesListSchema.safeParse({
        certificates: [{ id: "cert-123" }],
      })
      expect(result.success).toBe(false)
    })

    it("should validate list with certificates having different validity dates", () => {
      expect(
        CertificatesListSchema.safeParse({
          certificates: [
            {
              ...validCertificate,
              id: "cert-1",
              certificate: {
                pem: "-----BEGIN CERTIFICATE-----\n...",
                validity: { not_before: 1000000000, not_after: 1100000000 },
              },
            },
            {
              ...validCertificate,
              id: "cert-2",
              certificate: {
                pem: "-----BEGIN CERTIFICATE-----\n...",
                validity: { not_before: 1700000000, not_after: 1800000000 },
              },
            },
          ],
        }).success
      ).toBe(true)
    })

    it("should validate list with certificates with and without CSR", () => {
      expect(
        CertificatesListSchema.safeParse({
          certificates: [
            { ...validCertificate, id: "cert-1" },
            {
              ...validCertificate,
              id: "cert-2",
              csr: "-----BEGIN CERTIFICATE REQUEST-----\n...",
            },
          ],
        }).success
      ).toBe(true)
    })

    it("should validate list with certificates with and without certificate_chain", () => {
      expect(
        CertificatesListSchema.safeParse({
          certificates: [
            { ...validCertificate, id: "cert-1" },
            {
              ...validCertificate,
              id: "cert-2",
              certificate_chain: {
                certificates: [{ pem: "-----BEGIN CERTIFICATE-----\n..." }],
                pem: "-----BEGIN CERTIFICATE-----\n...",
              },
            },
          ],
        }).success
      ).toBe(true)
    })

    it("should validate real-world certificate list response", () => {
      const realWorldResponse = {
        certificates: [
          {
            id: "cert-prod-001",
            certificate_authority_id: "ca-prod-001",
            project_id: "prod-project",
            certificate: {
              pem: "-----BEGIN CERTIFICATE-----\n...",
              validity: {
                not_before: 1705315200,
                not_after: 1736851200,
              },
            },
            certificate_chain: {
              certificates: [{ pem: "-----BEGIN CERTIFICATE-----\n..." }, { pem: "-----BEGIN CERTIFICATE-----\n..." }],
              pem: "-----BEGIN CERTIFICATE-----\n...",
            },
            configuration: {
              validity: {
                not_before: 1705315200,
                not_after: 1736851200,
              },
            },
            csr: "-----BEGIN CERTIFICATE REQUEST-----\n...",
          },
          {
            id: "cert-prod-002",
            certificate_authority_id: "ca-prod-001",
            project_id: "prod-project",
            certificate: {
              pem: "-----BEGIN CERTIFICATE-----\n...",
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
          },
        ],
      }

      expect(CertificatesListSchema.safeParse(realWorldResponse).success).toBe(true)
    })
  })
})
