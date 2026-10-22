import { appendQueryParamsFromObject } from "@/server/helpers/queryParams"
import {
  NetworkSummary,
  NetworkSummaryListResponseSchema,
  SecurityGroupSummary,
  SecurityGroupSummaryListResponseSchema,
  SubnetSummary,
  SubnetSummaryListResponseSchema,
} from "../types/index"
import { getNetworkService, parseOrThrow } from "./index"
import { chunk, withQuery } from "./requestHelpers"

/**
 * Best-effort, batched name lookups for Neutron resources referenced by other resources
 * (e.g. the networks and subnets of routers or ports).
 *
 * Every lookup sends one request per chunk of IDs (`?id=a&id=b&fields=...`), never one request per item,
 * and returns [] on any failure (e.g. resources not visible to the user), so callers fall back to IDs.
 */

type NetworkService = ReturnType<typeof getNetworkService>

/** Max IDs per lookup request (~2.5 KB of id params), keeps URLs well below proxy limits */
export const LOOKUP_CHUNK_SIZE = 50

const NETWORKS_BASE_URL = "v2.0/networks"
const SUBNETS_BASE_URL = "v2.0/subnets"
const SECURITY_GROUPS_BASE_URL = "v2.0/security-groups"

const fetchSummaries = async <T>(ids: string[], fetchChunk: (chunkIds: string[]) => Promise<T[]>): Promise<T[]> => {
  const uniqueIds = [...new Set(ids)]
  if (uniqueIds.length === 0) return []
  try {
    const chunks = await Promise.all(chunk(uniqueIds, LOOKUP_CHUNK_SIZE).map(fetchChunk))
    return chunks.flat()
  } catch {
    return []
  }
}

const getJson = async (network: NetworkService, url: string): Promise<unknown> => {
  const response = await network.get(url)
  if (!response.ok) throw new Error(`Lookup failed (HTTP ${response.status})`)
  return response.json()
}

/** Network names by ID. */
export const fetchNetworkSummaries = (
  network: NetworkService,
  ids: string[],
  context = "networkLookups.networks"
): Promise<NetworkSummary[]> =>
  fetchSummaries(ids, async (chunkIds) => {
    const params = appendQueryParamsFromObject({ id: chunkIds, fields: ["id", "name"] })
    const data = await getJson(network, withQuery(NETWORKS_BASE_URL, params))
    return parseOrThrow(NetworkSummaryListResponseSchema, data, context).networks
  })

/** Subnet names (and optionally CIDRs) by ID. */
export const fetchSubnetSummaries = (
  network: NetworkService,
  ids: string[],
  fields: Array<"id" | "name" | "cidr"> = ["id", "name"],
  context = "networkLookups.subnets"
): Promise<SubnetSummary[]> =>
  fetchSummaries(ids, async (chunkIds) => {
    const params = appendQueryParamsFromObject({ id: chunkIds, fields })
    const data = await getJson(network, withQuery(SUBNETS_BASE_URL, params))
    return parseOrThrow(SubnetSummaryListResponseSchema, data, context).subnets
  })

/** Security group names by ID. */
export const fetchSecurityGroupSummaries = (
  network: NetworkService,
  ids: string[],
  context = "networkLookups.securityGroups"
): Promise<SecurityGroupSummary[]> =>
  fetchSummaries(ids, async (chunkIds) => {
    const params = appendQueryParamsFromObject({ id: chunkIds, fields: ["id", "name"] })
    const data = await getJson(network, withQuery(SECURITY_GROUPS_BASE_URL, params))
    return parseOrThrow(SecurityGroupSummaryListResponseSchema, data, context).security_groups
  })
