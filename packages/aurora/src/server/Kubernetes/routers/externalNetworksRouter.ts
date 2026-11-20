import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "../../trpc"
import { withErrorHandling } from "../../helpers/errorHandling"
import { kubernetesInputSchema } from "../types/common"
import type { ExternalNetwork } from "../types/externalNetwork"
import { getNetworkService, parseOrThrow, HTTP_STATUS_ERROR_MAP } from "../../Network/helpers"
import { requestOrThrow, nextPageUrl } from "../../Network/helpers/requestHelpers"
import { NetworkListResponseSchema } from "../../Network/types/network"

/**
 * External networks router for Kubernetes cluster creation.
 * The landscape parameter is accepted for a uniform client call but unused;
 * networks come from Neutron, not Gardener.
 *
 * See elektra/plugins/kubernetes_ng/app/controllers/kubernetes/clusters_controller.rb#external_networks
 */
export const externalNetworksRouter = {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- landscape param for uniform client calls
  list: projectScopedProcedure.input(kubernetesInputSchema).query(async ({ ctx, input: _input }) =>
    withErrorHandling(async (): Promise<ExternalNetwork[]> => {
      const network = getNetworkService(ctx)
      const baseUrl = "v2.0/networks"

      // Collect all pages with router:external=true and shared=true filters
      const items: ExternalNetwork[] = []
      const visited = new Set<string>()
      let nextUrl: string | undefined = `${baseUrl}?router:external=true&shared=true`

      while (nextUrl && !visited.has(nextUrl)) {
        visited.add(nextUrl)

        const response = await requestOrThrow(
          () => network.get(nextUrl!),
          (response) => {
            const code =
              (response.status && HTTP_STATUS_ERROR_MAP[response.status as keyof typeof HTTP_STATUS_ERROR_MAP]) ||
              "INTERNAL_SERVER_ERROR"
            return new TRPCError({
              code,
              message: "Could not load external networks.",
            })
          }
        )

        const { networks, networks_links } = parseOrThrow(
          NetworkListResponseSchema,
          await response.json(),
          "externalNetworks.list"
        )

        for (const n of networks) {
          items.push({
            id: n.id,
            name: n.name,
            description: n.description,
            availability_zones: n.availability_zones ?? [],
            status: n.status,
          })
        }

        nextUrl = nextPageUrl(baseUrl, networks_links)
      }

      return items
    }, "list external networks")
  ),
}
