import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"
import { omit } from "@/server/helpers/object"
import { parseOrThrow } from "@/server/Network/helpers"
import {
  CertificateAuthoritiesListSchema,
  CertificateAuthoritiesListInputSchema,
  CertificateAuthoritySchema,
  CertificateAuthorityIdInputSchema,
  CertificatesListSchema,
  CertificateSchema,
  Certificate,
  CertificateAuthority,
  CertificateIdInputSchema,
  CertificateAuthorityCreateSchema,
  CreateCertificateInputSchema,
  CertificateAuthorityImportInputSchema,
} from "../types/pca"

/** PCA (Private Certificate Authority) - Clavis service for certificate authority management  */
const PCA_BASE_URL = "certificate-authorities"

export const pcaRouter = {
  list: projectScopedProcedure
    .input(CertificateAuthoritiesListInputSchema)
    .query(async ({ input, ctx }): Promise<CertificateAuthority[]> => {
      return withErrorHandling(async () => {
        // Use "pca" or "clavis" when the service will be GA as "clavis-beta" and "clavis-dev" are dev keys.
        const pca = ctx.openstack?.service("pca")
        validateOpenstackService(pca, "pca")

        const queryParams = new URLSearchParams()
        if (input.limit !== undefined) queryParams.set("limit", String(input.limit))
        if (input.next_page_marker !== undefined) queryParams.set("next_page_marker", input.next_page_marker)
        const url = queryParams.size > 0 ? `${PCA_BASE_URL}?${queryParams.toString()}` : PCA_BASE_URL

        const response = await pca.get(url)
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
    .mutation(async ({ input, ctx }): Promise<CertificateAuthority> => {
      return withErrorHandling(async () => {
        // Use "pca" or "clavis" when the service will be GA as "clavis-beta" and "clavis-dev" are dev keys.
        const pca = ctx.openstack?.service("pca")
        validateOpenstackService(pca, "pca")

        const response = await pca.post(PCA_BASE_URL, omit(input, "project_id"))
        const data = await response.json()

        return parseOrThrow(CertificateAuthoritySchema, data, "pcaRouter.create")
      }, "create certificate authority")
    }),
  getById: projectScopedProcedure
    .input(CertificateAuthorityIdInputSchema)
    .query(async ({ input, ctx }): Promise<CertificateAuthority> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("pca")
        validateOpenstackService(pca, "pca")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}`
        const response = await pca.get(url)
        const data = await response.json()

        return parseOrThrow(CertificateAuthoritySchema, data, "pcaRouter.getById")
      }, "get certificate authority details")
    }),
  // Permanently deletes a Certificate Authority. This operation is irreversible.
  delete: projectScopedProcedure
    .input(CertificateAuthorityIdInputSchema)
    .mutation(async ({ input, ctx }): Promise<void> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("pca")
        validateOpenstackService(pca, "pca")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}`
        // 204 Certificate Authority deleted successfully
        await pca.del(url)
      }, "delete certificate authority")
    }),
  /**
   * Imports Certificate Authority certificate
   * Transitioning the CA from AWAITING_CERTIFICATE to READY state
   * after which the CA becomes fully operational and can issue certificates to end entities
   */
  import: projectScopedProcedure
    .input(CertificateAuthorityImportInputSchema)
    .mutation(async ({ input, ctx }): Promise<CertificateAuthority> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("pca")
        validateOpenstackService(pca, "pca")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}:importCertificate`
        const response = await pca.post(url, {
          imported_certificate_chain: input.imported_certificate_chain,
        })
        const data = await response.json()

        return parseOrThrow(CertificateAuthoritySchema, data, "pcaRouter.import")
      }, "import certificate of certificate authority")
    }),
  listCertificates: projectScopedProcedure
    .input(CertificateAuthorityIdInputSchema)
    .query(async ({ input, ctx }): Promise<Certificate[]> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("pca")
        validateOpenstackService(pca, "pca")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}/certificates`
        const response = await pca.get(url)
        const data = await response.json()

        return parseOrThrow(CertificatesListSchema, data, "pcaRouter.listCertificates").certificates
      }, "list certificates for certificate authority")
    }),
  createCertificate: projectScopedProcedure
    .input(CreateCertificateInputSchema)
    .mutation(async ({ input, ctx }): Promise<Certificate> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("pca")
        validateOpenstackService(pca, "pca")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}/certificates`
        const response = await pca.post(url, omit(input, "project_id", "certificate_authority_id"))
        const data = await response.json()

        return parseOrThrow(CertificateSchema, data, "pcaRouter.createCertificate")
      }, "create certificate for certificate authority")
    }),
  getByIdCertificate: projectScopedProcedure
    .input(CertificateIdInputSchema)
    .query(async ({ input, ctx }): Promise<Certificate> => {
      return withErrorHandling(async () => {
        const pca = ctx.openstack?.service("pca")
        validateOpenstackService(pca, "pca")

        const url = `${PCA_BASE_URL}/${input.certificate_authority_id}/certificates/${input.certificate_id}`
        const response = await pca.get(url)
        const data = await response.json()

        return parseOrThrow(CertificateSchema, data, "pcaRouter.getByIdCertificate")
      }, "get certificate details")
    }),
}
