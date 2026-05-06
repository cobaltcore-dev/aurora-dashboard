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

const CLAVIS_BASE_URL = "v1/certificate-authorities"

export const clavisRouter = {
  list: projectScopedProcedure.query(async ({ ctx }) => {
    return withErrorHandling(async () => {
      const clavisService = ctx.openstack?.service("clavis") ?? ctx.openstack?.service("pca")
      validateOpenstackService(clavisService, "clavis")

      const response = await clavisService.get(CLAVIS_BASE_URL)
      const data = await response.json()

      return parseOrThrow(CertificateAuthoritiesListSchema, data, "clavisRouter.list").certificate_authorities
    }, "list certificate authorities")
  }),
  listCertificates: projectScopedProcedure
    .input(CertificateAuthorityCertificatesInputSchema)
    .query(async ({ input, ctx }): Promise<Certificate[]> => {
      return withErrorHandling(async () => {
        const clavisService = ctx.openstack?.service("clavis") ?? ctx.openstack?.service("pca")
        validateOpenstackService(clavisService, "clavis")

        const url = `${CLAVIS_BASE_URL}/${input.certificate_authority_id}/certificates`
        const response = await clavisService.get(url)
        const data = await response.json()

        return parseOrThrow(CertificatesListSchema, data, "clavisRouter.listCertificates").certificates
      }, "list certificates for certificate authority")
    }),
}
