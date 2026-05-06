import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"
import { parseOrThrow } from "@/server/Network/helpers"
import { CertificateAuthoritiesListSchema } from "../types/pca"

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
}
