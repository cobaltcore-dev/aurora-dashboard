import { z } from "zod"

/** PCA (Private Certificate Authority) - Clavis service schemas for certificate authority management  */

/** Dates as Unix timestamp. */
const CertificateValiditySchema = z.object({
  not_after: z.number().int(),
  not_before: z.number().int().optional(),
})

const CertificateAuthorityCertificateSchema = z.object({
  /** PEM encoded certificate data. */
  pem: z.string(),
  validity: CertificateValiditySchema,
})

const CertificateAuthorityCertificateChainSchema = z.object({
  certificates: z.array(z.object({ pem: z.string() })),
  /** Concatenated PEM certificates of the chain. */
  pem: z.string(),
})

const CertificateAuthorityAdditionalAttributeSchema = z.object({
  /** ASN.1 Object Identifier of the attribute */
  key: z.array(z.number().int()),
  value: z.string(),
})

const CertificateAuthoritySubjectSchema = z.object({
  additional_attribute: z.array(CertificateAuthorityAdditionalAttributeSchema).optional(),
  /** Typically domain name */
  common_name: z.string(),
  /** Country codes (ISO 3166-1 alpha-2). */
  country: z.array(z.string()).optional(),
  /** Locality/city names. */
  locality: z.array(z.string()).optional(),
  /** Organization names. */
  organization: z.array(z.string()).optional(),
  /** Organizational unit names. */
  organizational_unit: z.array(z.string()).optional(),
  /** Postal/ZIP codes. */
  postal_code: z.array(z.string()).optional(),
  /** State or province names. */
  province: z.array(z.string()).optional(),
  serial_number: z.string().optional(),
  street_address: z.array(z.string()).optional(),
})

const CertificateAuthorityStateSchema = z.enum(["CREATING", "AWAITING_CERTIFICATE", "READY", "FAILED", "UNEXPECTED"])

export const CertificateAuthoritySchema = z.object({
  certificate: CertificateAuthorityCertificateSchema.optional(),
  /** Details of Certificate Authority certificate's issuers chain. */
  certificate_chain: CertificateAuthorityCertificateChainSchema.optional(),
  configuration: z
    .object({
      /** X.509 subject of Certificate Authority. Required on create operation. */
      subject: CertificateAuthoritySubjectSchema,
    })
    .optional(),
  csr: z.string().optional(),
  id: z.string(),
  /**
   * Required on import certificate operation.
   * Certificate Authority certificate chain, in PEM format. Consists of concatenated string
   * of Certificate Authority certificate, followed by its intermediate issuing CAs certificates
   * and root issuing CA certificate last.
   */
  imported_certificate_chain: z.string().optional(),
  /** Identifier of OpenStack project that Certificate Authority belongs. */
  project_id: z.string(),
  /** Current operational state of Certificate Authority. */
  state: CertificateAuthorityStateSchema,
})

export const CertificateAuthorityResponseSchema = z.object({
  certificate_authority: CertificateAuthoritySchema,
})

export const CertificateAuthoritiesListSchema = z.object({
  certificate_authorities: z.array(CertificateAuthoritySchema),
})

// Used by: /v1/certificate-authorities - Create new Certificate Authority
export const CertificateAuthorityCreateSchema = z.object({
  configuration: z.object({
    subject: CertificateAuthoritySubjectSchema,
  }),
})

/**
 * Input schema for Certificate Authority resource identification.
 *
 * Used by:
 * - GET /v1/certificate-authorities/{certificate_authority_id} - Show Certificate Authority details
 * - DELETE /v1/certificate-authorities/{certificate_authority_id} - Delete Certificate Authority
 * - GET /v1/certificate-authorities/{certificate_authority_id}/certificates - List Certificates
 *
 */
export const CertificateAuthorityIdInputSchema = z.object({
  project_id: z.string(),
  certificate_authority_id: z.string().min(1),
})

// Used by: /v1/certificate-authorities/{certificate_authority_id}:importCertificate - Import certificate of Certificate Authority
export const CertificateAuthorityImportInputSchema = CertificateAuthorityIdInputSchema.extend({
  imported_certificate_chain: z.string().min(1),
})

// Used by: /v1/certificate-authorities/{certificate_authority_id}/certificates/{certificate_id} - Get Certificate details
export const CertificateIdInputSchema = CertificateAuthorityIdInputSchema.extend({
  certificate_id: z.string().min(1),
})

export const CertificateConfigurationSchema = z.object({
  validity: CertificateValiditySchema,
})

// Used by: /v1/certificate-authorities/{certificate_authority_id}/certificates - Create new Certificate
export const CreateCertificateInputSchema = z.object({
  project_id: z.string(),
  certificate_authority_id: z.string(),
  csr: z.string(),
  configuration: CertificateConfigurationSchema,
})

export const CertificateSchema = z.object({
  certificate: CertificateAuthorityCertificateSchema.optional(),
  certificate_authority_id: z.string(),
  certificate_chain: CertificateAuthorityCertificateChainSchema.optional(),
  configuration: CertificateConfigurationSchema.optional(),
  csr: z.string().optional(),
  id: z.string(),
  project_id: z.string(),
})

export const CertificatesListSchema = z.object({
  certificates: z.array(CertificateSchema),
})

export type Certificate = z.infer<typeof CertificateSchema>
export type CertificateAuthority = z.infer<typeof CertificateAuthoritySchema>
export type CertificateAuthorityState = z.infer<typeof CertificateAuthorityStateSchema>
