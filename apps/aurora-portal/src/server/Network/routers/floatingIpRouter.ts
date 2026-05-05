import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { filterBySearchParams } from "@/server/helpers/filterBySearchParams"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { omit } from "@/server/helpers/object"
import { validateOpenstackService } from "@/server/helpers/validateOpenstackService"
import {
  FloatingIpQueryParametersSchema,
  FloatingIp,
  FloatingIpListResponseSchema,
  FloatingIpResponseSchema,
  FloatingIpIdInputSchema,
  FloatingIpUpdateRequestSchema,
  FloatingIpCreateRequestSchema,
  ExternalNetwork,
  ExternalNetworksQuerySchema,
  ExternalNetworksResponseSchema,
  DnsDomain,
  DnsDomainResponseSchema,
  AvailablePort,
  AvailablePortsQuerySchema,
  AvailablePortsResponseSchema,
} from "../types/floatingIp"
import { FloatingIpErrorHandlers } from "../helpers/floatingIpHelpers"
import { getNetworkService, parseOrThrow } from "../helpers/index"

const FLOATING_IPS_BASE_URL = "v2.0/floatingips"
const NETWORK_BASE_URL = "v2.0/networks"
const DNS_BASE_URL = "v2/zones"
const PORT_BASE_URL = "v2.0/ports"

/**
 * tRPC router for OpenStack Neutron Floating IPs.
 *
 * Currently exposes:
 * - list: GET /v2.0/floatingips List floating IPs with pagination, sorting and filtering support, includes BFF-side search.
 * - create: POST /v2.0/floatingips Create floating IP.
 * - getById: GET /v2.0/floatingips/{floatingip_id} Show floating IP details.
 * - update: PUT /v2.0/floatingips/{floatingip_id} Update floating IP.
 * - delete: DELETE /v2.0/floatingips/{floatingip_id} Delete floating IP.
 *
 * - listExternalNetworks: GET /v2.0/networks?router:external=true for creating floating IP, fetches only external networks with router:true.
 * - listDnsDomains: GET /v2/zones for creating floating IP, fetches only DNS domains.
 * - listAvailablePorts: GET /v2.0/ports List available ports for creating or updating floating IP, ensuring users can only see valid, unassociated ports.
 */
export const floatingIpRouter = {
  list: projectScopedProcedure
    .input(FloatingIpQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<FloatingIp[]> => {
      return withErrorHandling(async () => {
        const { searchTerm, ...openstackFilters } = input
        const network = getNetworkService(ctx)

        const queryParams = appendQueryParamsFromObject(openstackFilters)

        const queryString = queryParams.toString()
        const url = queryString ? `${FLOATING_IPS_BASE_URL}?${queryString}` : FLOATING_IPS_BASE_URL

        const response = await network.get(url)
        if (!response.ok) {
          throw FloatingIpErrorHandlers.list(response)
        }

        const data = await response.json()
        const { floatingips } = parseOrThrow(FloatingIpListResponseSchema, data, "floatingIpRouter.list")

        return filterBySearchParams(floatingips, searchTerm, ["description"])
      }, "list floating IPs")
    }),
  create: projectScopedProcedure
    .input(FloatingIpCreateRequestSchema)
    .mutation(async ({ input, ctx }): Promise<FloatingIp> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const requestBody = {
          floatingip: {
            tenant_id: input.tenant_id,
            project_id: input.project_id,
            floating_network_id: input.floating_network_id,
            ...(input.fixed_ip_address !== undefined && { fixed_ip_address: input.fixed_ip_address }),
            ...(input.floating_ip_address !== undefined && { floating_ip_address: input.floating_ip_address }),
            ...(input.port_id !== undefined && { port_id: input.port_id }),
            ...(input.subnet_id !== undefined && { subnet_id: input.subnet_id }),
            ...(input.distributed !== undefined && { distributed: input.distributed }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.dns_domain !== undefined && { dns_domain: input.dns_domain }),
            ...(input.dns_name !== undefined && { dns_name: input.dns_name }),
            ...(input.qos_policy_id !== undefined && { qos_policy_id: input.qos_policy_id }),
          },
        }
        const response = await network.post(FLOATING_IPS_BASE_URL, requestBody)
        if (!response.ok) {
          throw FloatingIpErrorHandlers.create(response)
        }

        const data = await response.json()
        return parseOrThrow(FloatingIpResponseSchema, data, "floatingIpRouter.create").floatingip
      }, "create floating IP")
    }),
  getById: projectScopedProcedure.input(FloatingIpIdInputSchema).query(async ({ input, ctx }): Promise<FloatingIp> => {
    return withErrorHandling(async () => {
      const { floatingip_id } = input
      const network = getNetworkService(ctx)

      const response = await network.get(`${FLOATING_IPS_BASE_URL}/${floatingip_id}`)
      if (!response.ok) {
        throw FloatingIpErrorHandlers.get(response, floatingip_id)
      }

      const data = await response.json()
      return parseOrThrow(FloatingIpResponseSchema, data, "floatingIpRouter.getById").floatingip
    }, "show floating IP details")
  }),
  update: projectScopedProcedure
    .input(FloatingIpUpdateRequestSchema)
    .mutation(async ({ input, ctx }): Promise<FloatingIp> => {
      return withErrorHandling(async () => {
        const { floatingip_id, ...updateFields } = input
        const network = getNetworkService(ctx)

        const requestBody = {
          floatingip: {
            port_id: updateFields.port_id,
            ...(updateFields.fixed_ip_address !== undefined && { fixed_ip_address: updateFields.fixed_ip_address }),
            ...(updateFields.description !== undefined && { description: updateFields.description }),
            ...(updateFields.distributed !== undefined && { distributed: updateFields.distributed }),
          },
        }
        const response = await network.put(`${FLOATING_IPS_BASE_URL}/${floatingip_id}`, requestBody)
        if (!response.ok) {
          throw FloatingIpErrorHandlers.update(response, floatingip_id)
        }

        const data = await response.json()
        return parseOrThrow(FloatingIpResponseSchema, data, "floatingIpRouter.update").floatingip
      }, "update floating IP")
    }),
  delete: projectScopedProcedure.input(FloatingIpIdInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { floatingip_id } = input
      const network = getNetworkService(ctx)

      // OpenStack DELETE returns 204 No Content on success
      const response = await network.del(`${FLOATING_IPS_BASE_URL}/${floatingip_id}`)
      if (!response.ok) {
        throw FloatingIpErrorHandlers.delete(response, floatingip_id)
      }

      // Return true for all successful responses (2xx)
      return true
    }, "delete floating IP")
  }),
  listExternalNetworks: projectScopedProcedure
    .input(ExternalNetworksQuerySchema)
    .query(async ({ input, ctx }): Promise<ExternalNetwork[]> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const queryParams = appendQueryParamsFromObject(omit(input, "project_id"))
        const queryString = queryParams.toString()
        const url = queryString ? `${NETWORK_BASE_URL}?${queryString}` : NETWORK_BASE_URL

        const response = await network.get(url)
        const data = await response.json()

        return parseOrThrow(ExternalNetworksResponseSchema, data, "floatingIpRouter.listExternalNetworks").networks
      }, "list external networks for floating IP create operation")
    }),
  listDnsDomains: projectScopedProcedure.query(async ({ ctx }): Promise<DnsDomain[]> => {
    return withErrorHandling(async () => {
      const dnsService = ctx.openstack?.service("dns") ?? ctx.openstack?.service("designate")
      validateOpenstackService(dnsService, "dns")

      const response = await dnsService.get(DNS_BASE_URL)
      const data = await response.json()

      return parseOrThrow(DnsDomainResponseSchema, data, "floatingIpRouter.listDnsDomains").zones
    }, "list dns domains for floating IP create operation")
  }),
  listAvailablePorts: projectScopedProcedure
    .input(AvailablePortsQuerySchema)
    .query(async ({ input, ctx }): Promise<AvailablePort[]> => {
      return withErrorHandling(async () => {
        const network = getNetworkService(ctx)

        const queryParams = appendQueryParamsFromObject({ ...input, fields: ["id", "name", "fixed_ips"] })
        const queryString = queryParams.toString()
        const url = queryString ? `${PORT_BASE_URL}?${queryString}` : PORT_BASE_URL

        const response = await network.get(url)
        const data = await response.json()

        return parseOrThrow(AvailablePortsResponseSchema, data, "floatingIpRouter.listAvailablePorts").ports
      }, "list available ports for floating IP update and create operations")
    }),
}
