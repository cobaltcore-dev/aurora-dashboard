import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"
import { parseOrThrow } from "@/server/Network/helpers"
import {
  CertificateAuthoritiesListSchema,
  CertificateAuthorityIdInputSchema,
  CertificatesListSchema,
  Certificate,
  CertificateAuthority,
  CertificateAuthorityResponseSchema,
  CertificateIdInputSchema,
  CertificateResponseSchema,
  CertificateAuthorityCreateSchema,
} from "../types/pca"

/** PCA (Private Certificate Authority) - Clavis service for certificate authority management  */
const PCA_BASE_URL = "v1/certificate-authorities"

export const pcaRouter = {
  list: projectScopedProcedure.query(async ({ ctx }) => {
    return withErrorHandling(async () => {
      const pca = ctx.openstack?.service("clavis")
      validateOpenstackService(pca, "clavis")

      const response = await pca.get(PCA_BASE_URL)
      const data = await response.json()

      return parseOrThrow(CertificateAuthoritiesListSchema, data, "pcaRouter.list").certificate_authorities
    }, "list certificate authorities")
  }),
  /**
   * Creates a new Certificate Authority (CA).
   * The CA is created in CREATING state and transitions to AWAITING_CERTIFICATE state once its CSR has been generated.
   * CA in AWAITING_CERTIFICATE can't issue end-entity certificates, and needs to have its certificate imported - see the respective importCertificate endpoint.
   */
  create: projectScopedProcedure
    .input(CertificateAuthorityCreateSchema)
    .query(async ({ input, ctx }): Promise<CertificateAuthority> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("clavis")
        validateOpenstackService(pca, "clavis")

        const response = await pca.post(PCA_BASE_URL, { body: JSON.stringify(input) })
        const data = await response.json()

        // Certificate Authority creation initiated successfully (async operation)
        return parseOrThrow(CertificateAuthorityResponseSchema, data, "pcaRouter.create").certificate_authority
      }, "create certificate authority")
  }),
  getById: projectScopedProcedure
    .input(CertificateAuthorityIdInputSchema)
    .query(async ({ input, ctx }): Promise<CertificateAuthority> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("clavis")
        validateOpenstackService(pca, "clavis")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}`
        const response = await pca.get(url)
        const data = await response.json()

        return parseOrThrow(CertificateAuthorityResponseSchema, data, "pcaRouter.getById").certificate_authority
      }, "get certificate authority details")
    }),
  listCertificates: projectScopedProcedure
    .input(CertificateAuthorityIdInputSchema)
    .query(async ({ input, ctx }): Promise<Certificate[]> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("clavis")
        validateOpenstackService(pca, "clavis")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}/certificates`
        const response = await pca.get(url)
        const data = await response.json()

        return parseOrThrow(CertificatesListSchema, data, "pcaRouter.listCertificates").certificates
      }, "list certificates for certificate authority")
    }),
  getByIdCertificate: projectScopedProcedure
    .input(CertificateIdInputSchema)
    .query(async ({ input, ctx }): Promise<Certificate> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("clavis")
        validateOpenstackService(pca, "clavis")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}/certificates/${input.certificate_id}`
        const response = await pca.get(url)
        const data = await response.json()

        return parseOrThrow(CertificateResponseSchema, data, "pcaRouter.getByIdCertificate").certificate
      }, "get certificate details")
    }),
}
