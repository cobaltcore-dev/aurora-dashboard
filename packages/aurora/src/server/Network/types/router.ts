import { z } from "zod"
import { isIP } from "node:net"
import { projectScopedInputSchema } from "../../trpc"
import { ISO8601TimestampSchema, NetworkPortStatusSchema, SortDirSchema } from "./index"

/* -------------------------------------------------------------------------- */
/*                                 Primitives                                 */
/* -------------------------------------------------------------------------- */

export const isValidIpAddress = (value: string): boolean => isIP(value) !== 0

export const isValidCidr = (value: string): boolean => {
  const parts = value.split("/")
  if (parts.length !== 2) return false

  const [address, prefix] = parts
  if (!/^\d{1,3}$/.test(prefix)) return false

  const version = isIP(address)
  if (version === 0) return false

  const prefixLength = Number(prefix)
  return version === 4 ? prefixLength <= 32 : prefixLength <= 128
}

const resourceIdSchema = z.string().trim().min(1, "ID is required")
const ipAddressSchema = z.string().trim().refine(isValidIpAddress, { message: "Must be a valid IPv4 or IPv6 address" })
const cidrSchema = z.string().trim().refine(isValidCidr, { message: "Must be a valid CIDR, e.g. 10.0.0.0/24" })
const nameSchema = z.string().trim().max(255, "Name must be at most 255 characters")
const descriptionSchema = z.string().max(255, "Description must be at most 255 characters")

/* -------------------------------------------------------------------------- */
/*                         Neutron response schemas                           */
/* -------------------------------------------------------------------------- */

export const ExternalFixedIpSchema = z.object({
  subnet_id: z.string(),
  ip_address: z.string(),
})

export const ExternalGatewayInfoSchema = z.object({
  network_id: z.string(),
  enable_snat: z.boolean().optional(),
  external_fixed_ips: z.array(ExternalFixedIpSchema).optional(),
  qos_policy_id: z.string().nullish(),
})

export const ExtraRouteSchema = z.object({
  destination: z.string(),
  nexthop: z.string(),
})

export const RouterSchema = z.object({
  id: z.string(),
  name: z.string().default(""),
  description: z.string().optional().default(""),
  status: z.string(),
  admin_state_up: z.boolean(),
  // Neutron returns `null` when no gateway is set
  external_gateway_info: ExternalGatewayInfoSchema.nullish(),
  // Only present when the `extraroute` extension is enabled
  routes: z.array(ExtraRouteSchema).optional().default([]),
  // Only present when the corresponding extensions are enabled (dvr, l3-ha, ...)
  distributed: z.boolean().nullish(),
  ha: z.boolean().nullish(),
  enable_ndp_proxy: z.boolean().nullish(),
  enable_default_route_bfd: z.boolean().nullish(),
  enable_default_route_ecmp: z.boolean().nullish(),
  availability_zone_hints: z.array(z.string()).optional(),
  availability_zones: z.array(z.string()).optional(),
  flavor_id: z.string().nullish(),
  project_id: z.string(),
  tenant_id: z.string().optional(),
  revision_number: z.number().optional(),
  tags: z.array(z.string()).optional(),
  created_at: ISO8601TimestampSchema.optional(),
  updated_at: ISO8601TimestampSchema.optional(),
})

export const RouterListResponseSchema = z.object({
  routers: z.array(RouterSchema),
})

export const RouterResponseSchema = z.object({
  router: RouterSchema,
})

/** Response body of PUT /v2.0/routers/{id}/add_router_interface and .../remove_router_interface */
export const RouterInterfaceInfoSchema = z.object({
  id: z.string(), // router ID
  subnet_id: z.string().optional(),
  subnet_ids: z.array(z.string()).optional(),
  port_id: z.string(),
  network_id: z.string().optional(),
  project_id: z.string().optional(),
  tenant_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const RouterPortSchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  network_id: z.string(),
  device_owner: z.string(),
  status: NetworkPortStatusSchema,
  admin_state_up: z.boolean().optional(),
  mac_address: z.string().optional(),
  fixed_ips: z.array(ExternalFixedIpSchema).optional().default([]),
})

export const RouterPortListResponseSchema = z.object({
  ports: z.array(RouterPortSchema),
})

/**
 * Reduced port schema for resolving the private networks of many routers at once.
 * Used by GET /v2.0/ports?device_id=...&device_owner=...&fields=id&fields=device_id&fields=device_owner&fields=network_id
 */
export const RouterInterfacePortSummarySchema = z.object({
  id: z.string(),
  /** The ID of the router owning the interface */
  device_id: z.string(),
  device_owner: z.string(),
  network_id: z.string(),
})

export const RouterInterfacePortSummaryListResponseSchema = z.object({
  ports: z.array(RouterInterfacePortSummarySchema),
})

export const ExtensionListResponseSchema = z.object({
  extensions: z.array(
    z.object({
      alias: z.string(),
      name: z.string().optional(),
    })
  ),
})

/* -------------------------------------------------------------------------- */
/*                              tRPC input schemas                            */
/* -------------------------------------------------------------------------- */

/** Sort keys supported by Neutron for GET /v2.0/routers */
export const RouterSortKeySchema = z.enum([
  "admin_state_up",
  "flavor_id",
  "id",
  "name",
  "status",
  "project_id",
  "tenant_id",
])

export const RouterQueryParametersSchema = projectScopedInputSchema.extend({
  // Passed through to Neutron
  name: z.string().optional(),
  description: z.string().optional(),
  admin_state_up: z.boolean().optional(),
  sort_key: RouterSortKeySchema.optional(),
  sort_dir: SortDirSchema.optional(),
  // Comma-separated tag lists, as Neutron expects
  tags: z.string().optional(),
  tags_any: z.string().optional(),
  not_tags: z.string().optional(),
  not_tags_any: z.string().optional(),
  // Applied BFF-side
  searchTerm: z.string().trim().optional(),
  status: z.string().optional(),
  has_gateway: z.boolean().optional(),
})

export const RouterIdInputSchema = projectScopedInputSchema.extend({
  router_id: resourceIdSchema,
})

export const GatewayFixedIpInputSchema = z
  .object({
    subnet_id: resourceIdSchema.optional(),
    ip_address: ipAddressSchema.optional(),
  })
  .refine((value) => Boolean(value.subnet_id || value.ip_address), {
    message: "Either subnet_id or ip_address is required",
  })

export const ExternalGatewayInfoInputSchema = z.object({
  network_id: resourceIdSchema,
  // Note: setting enable_snat is admin-only in the default Neutron policy
  enable_snat: z.boolean().optional(),
  external_fixed_ips: z.array(GatewayFixedIpInputSchema).optional(),
})

export const ExtraRouteInputSchema = z.object({
  destination: cidrSchema,
  nexthop: ipAddressSchema,
})

export const RouterCreateRequestSchema = projectScopedInputSchema.extend({
  name: nameSchema.min(1, "Name is required"),
  description: descriptionSchema.optional(),
  admin_state_up: z.boolean().optional(),
  external_gateway_info: ExternalGatewayInfoInputSchema.optional(),
  distributed: z.boolean().optional(),
  ha: z.boolean().optional(),
  availability_zone_hints: z.array(z.string().trim().min(1)).optional(),
  enable_ndp_proxy: z.boolean().optional(),
})

export const RouterUpdateRequestSchema = projectScopedInputSchema.extend({
  router_id: resourceIdSchema,
  name: nameSchema.optional(),
  description: descriptionSchema.optional(),
  admin_state_up: z.boolean().optional(),
  // Replaces the FULL list of extra routes (requires `extraroute` extension)
  routes: z.array(ExtraRouteInputSchema).optional(),
  // Changing distributed / ha requires the router to be admin_state_up=false first
  distributed: z.boolean().optional(),
  ha: z.boolean().optional(),
  enable_ndp_proxy: z.boolean().optional(),
})

export const RouterSetGatewayRequestSchema = projectScopedInputSchema.extend({
  router_id: resourceIdSchema,
  external_gateway_info: ExternalGatewayInfoInputSchema,
})

export const RouterInterfaceRequestSchema = projectScopedInputSchema
  .extend({
    router_id: resourceIdSchema,
    subnet_id: resourceIdSchema.optional(),
    port_id: resourceIdSchema.optional(),
  })
  .refine((value) => Boolean(value.subnet_id) !== Boolean(value.port_id), {
    message: "Provide exactly one of subnet_id or port_id",
    path: ["subnet_id"],
  })

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export type Router = z.infer<typeof RouterSchema>
export type ExternalGatewayInfo = z.infer<typeof ExternalGatewayInfoSchema>
export type ExtraRoute = z.infer<typeof ExtraRouteSchema>
export type RouterInterfaceInfo = z.infer<typeof RouterInterfaceInfoSchema>
export type RouterPort = z.infer<typeof RouterPortSchema>
export type RouterInterfacePortSummary = z.infer<typeof RouterInterfacePortSummarySchema>
export type ExternalFixedIp = z.infer<typeof ExternalFixedIpSchema>

/**
 * Router as returned by `list`: the external gateway is enriched with the external network name
 * and the subnet names of its fixed IPs, and the router's private networks are added.
 * Names are undefined when they can't be resolved.
 */
export type RouterListItem = Omit<Router, "external_gateway_info"> & {
  external_gateway_info?:
    | (Omit<ExternalGatewayInfo, "external_fixed_ips"> & {
        network_name?: string
        external_fixed_ips?: Array<ExternalFixedIp & { subnet_name?: string }>
      })
    | null
  /**
   * Internal (private) networks the router is attached to via interfaces, deduplicated.
   * `[]` = no interfaces, `undefined` = interfaces could not be resolved.
   */
  private_networks?: RouterPrivateNetwork[]
}

/** Router as returned by `getById`: external gateway enriched with network and subnet names. */
export type RouterDetails = Omit<RouterListItem, "private_networks">

/** A private network attached to a router via an interface port. */
export interface RouterPrivateNetwork {
  network_id: string
  network_name?: string
}

export type RouterQueryParameters = z.infer<typeof RouterQueryParametersSchema>
export type ExternalGatewayInfoInput = z.infer<typeof ExternalGatewayInfoInputSchema>
export type RouterCreateRequest = z.infer<typeof RouterCreateRequestSchema>
export type RouterUpdateRequest = z.infer<typeof RouterUpdateRequestSchema>
export type RouterSetGatewayRequest = z.infer<typeof RouterSetGatewayRequestSchema>
export type RouterInterfaceRequest = z.infer<typeof RouterInterfaceRequestSchema>

/** Router interface as returned to the UI: a port enriched with network name and subnet name/CIDR */
export interface RouterInterface {
  port_id: string
  port_name: string
  network_id: string
  /** Undefined when the network name can't be resolved */
  network_name?: string
  device_owner: string
  status: RouterPort["status"]
  admin_state_up?: boolean
  mac_address?: string
  fixed_ips: Array<{
    subnet_id: string
    subnet_name?: string
    subnet_cidr?: string
    ip_address: string
  }>
}

/** Which router-related Neutron extensions are enabled — drives conditional UI sections */
export interface RouterExtensionFlags {
  dvr: boolean
  l3Ha: boolean
  extraRoute: boolean
  extGwMode: boolean
  ndpProxy: boolean
  externalGatewayMultihoming: boolean
  availabilityZone: boolean
}
