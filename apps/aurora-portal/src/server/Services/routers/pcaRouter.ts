import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"
import { parseOrThrow } from "@/server/Network/helpers"
import {
  CertificateAuthoritiesListSchema,
  CertificateAuthorityCertificatesInputSchema,
  CertificatesListSchema,
  Certificate,
} from "../types/pca"

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
  listCertificates: projectScopedProcedure
    .input(CertificateAuthorityCertificatesInputSchema)
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
}
