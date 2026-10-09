import { TRPCError } from "@trpc/server"
import { projectScopedProcedure } from "@/server/trpc"
import { withErrorHandling } from "@/server/helpers/errorHandling"
import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import { omit } from "@/server/helpers/object"
import { validateAndEncodeResourceId } from "@cobaltcore-dev/signal-openstack"
import {
  Port,
  PortListItem,
  PortDetails,
  PortQueryParametersSchema,
  PortIdInputSchema,
  PortCreateRequestSchema,
  PortUpdateRequestSchema,
  PortListResponseSchema,
  PortResponseSchema,
} from "../types/port"
import {
  PortErrorHandlers,
  buildPortBody,
  collectPortLookupIds,
  applyPortNames,
  applySecurityGroupNames,
  filterPortsBySearchTerm,
} from "../helpers/portHelpers"
import { getNetworkService, parseOrThrow } from "../helpers/index"
import { requestOrThrow, withQuery } from "../helpers/requestHelpers"
import { fetchNetworkSummaries, fetchSecurityGroupSummaries, fetchSubnetSummaries } from "../helpers/lookupHelpers"

const PORTS_BASE_URL = "v2.0/ports"

const LIST_PORTS_QUERY_KEY_MAP: Record<string, string> = {
  tags_any: "tags-any",
  not_tags: "not-tags",
  not_tags_any: "not-tags-any",
}

const portUrl = (portId: string): string => `${PORTS_BASE_URL}/${validateAndEncodeResourceId(portId, "Port")}`

/**
 * tRPC router for OpenStack Neutron Ports.
 *
 * Ports are first-class resources in the project scope. The same procedures serve the global ports view
 * and views scoped to a network (via the optional `network_id` filter).
 *
 * Currently exposes:
 * - list: GET /v2.0/ports List ports of the current project, optionally filtered by network, with sorting
 *   and Neutron filters; BFF-side search. Resolves network and subnet names (GET /v2.0/networks, /v2.0/subnets).
 * - getById: GET /v2.0/ports/{port_id} Show port details, enriched with network, subnet and security group
 *   names (GET /v2.0/networks, /v2.0/subnets, /v2.0/security-groups).
 * - create: POST /v2.0/ports Create a port on a network (optionally with fixed IPs and security groups).
 * - update: PUT /v2.0/ports/{port_id} Update name, description, fixed IPs, security groups, etc.
 * - delete: DELETE /v2.0/ports/{port_id} Delete port.
 */
export const portsRouter = {
  list: projectScopedProcedure
    .input(PortQueryParametersSchema)
    .query(async ({ input, ctx }): Promise<PortListItem[]> => {
      return withErrorHandling(async () => {
        const { searchTerm, ...openstackFilters } = input
        const network = getNetworkService(ctx)

        // project_id is forwarded as a filter, so admin roles also only see the current project's ports here
        const queryParams = appendQueryParamsFromObject(openstackFilters, { keyMap: LIST_PORTS_QUERY_KEY_MAP })
        const response = await requestOrThrow(
          () => network.get(withQuery(PORTS_BASE_URL, queryParams)),
          PortErrorHandlers.list
        )

        const data = await response.json()
        const { ports } = parseOrThrow(PortListResponseSchema, data, "portsRouter.list")

        // Names are resolved before searching, so the search also matches network and subnet names.
        // Lookups are batched for the whole list (not per port) and best-effort.
        const { networkIds, subnetIds } = collectPortLookupIds(ports)
        const [networks, subnets] = await Promise.all([
          fetchNetworkSummaries(network, networkIds, "portsRouter.list.networks"),
          fetchSubnetSummaries(network, subnetIds, ["id", "name"], "portsRouter.list.subnets"),
        ])

        return filterPortsBySearchTerm(applyPortNames(ports, networks, subnets), searchTerm)
      }, "list ports")
    }),

  getById: projectScopedProcedure.input(PortIdInputSchema).query(async ({ input, ctx }): Promise<PortDetails> => {
    return withErrorHandling(async () => {
      const { port_id } = input
      const network = getNetworkService(ctx)

      const url = portUrl(port_id)
      const response = await requestOrThrow(() => network.get(url), PortErrorHandlers.get, port_id)

      const data = await response.json()
      const port = parseOrThrow(PortResponseSchema, data, "portsRouter.getById").port

      // Best-effort names, same as in `list`, plus security group names
      const { networkIds, subnetIds } = collectPortLookupIds([port])
      const [networks, subnets, securityGroups] = await Promise.all([
        fetchNetworkSummaries(network, networkIds, "portsRouter.getById.networks"),
        fetchSubnetSummaries(network, subnetIds, ["id", "name"], "portsRouter.getById.subnets"),
        fetchSecurityGroupSummaries(network, port.security_groups, "portsRouter.getById.securityGroups"),
      ])

      const [portWithNames] = applyPortNames([port], networks, subnets)
      return applySecurityGroupNames(portWithNames, securityGroups)
    }, "show port details")
  }),

  create: projectScopedProcedure.input(PortCreateRequestSchema).mutation(async ({ input, ctx }): Promise<Port> => {
    return withErrorHandling(async () => {
      const network = getNetworkService(ctx)
      // project_id is intentionally not sent: Neutron derives ownership from the (rescoped) token
      const requestBody = { port: buildPortBody(omit(input, "project_id")) }

      const response = await requestOrThrow(() => network.post(PORTS_BASE_URL, requestBody), PortErrorHandlers.create)

      const data = await response.json()
      return parseOrThrow(PortResponseSchema, data, "portsRouter.create").port
    }, "create port")
  }),

  update: projectScopedProcedure.input(PortUpdateRequestSchema).mutation(async ({ input, ctx }): Promise<Port> => {
    return withErrorHandling(async () => {
      const { port_id, ...fields } = omit(input, "project_id")
      const network = getNetworkService(ctx)

      // Note: fixed_ips, security_groups and allowed_address_pairs replace the complete list on the port
      const updateFields = buildPortBody(fields)
      if (Object.keys(updateFields).length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No fields provided to update" })
      }

      const url = portUrl(port_id)
      const response = await requestOrThrow(
        () => network.put(url, { port: updateFields }),
        PortErrorHandlers.update,
        port_id
      )

      const data = await response.json()
      return parseOrThrow(PortResponseSchema, data, "portsRouter.update").port
    }, "update port")
  }),

  delete: projectScopedProcedure.input(PortIdInputSchema).mutation(async ({ input, ctx }): Promise<boolean> => {
    return withErrorHandling(async () => {
      const { port_id } = input
      const network = getNetworkService(ctx)

      // OpenStack DELETE returns 204 No Content on success; 409 if the port is owned by a service (e.g. a router)
      const url = portUrl(port_id)
      await requestOrThrow(() => network.del(url), PortErrorHandlers.delete, port_id)

      return true
    }, "delete port")
  }),
}
