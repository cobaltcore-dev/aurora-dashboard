import { z } from "zod"
import { projectScopedInputSchema } from "../../trpc"
import { optionalText, optionalInteger } from "./fields"

export const shareNetworkSubnetSchema = z.object({
  id: optionalText,
  availability_zone: optionalText,
  neutron_net_id: optionalText,
  neutron_subnet_id: optionalText,
  cidr: optionalText,
  network_type: optionalText,
  gateway: optionalText,
  created_at: optionalText,
  updated_at: optionalText,
  segmentation_id: optionalInteger,
  mtu: optionalInteger,
  ip_version: optionalInteger,
})

const LEGACY_SUBNET_KEYS = [
  "neutron_net_id",
  "neutron_subnet_id",
  "cidr",
  "network_type",
  "segmentation_id",
  "mtu",
  "gateway",
  "ip_version",
] as const

// ≤ 2.50 shape (E8); at the pinned 2.65 Manila always returns the array
function normalizeShareNetwork(raw: unknown) {
  if (typeof raw !== "object" || raw === null) return raw
  const obj = raw as Record<string, unknown>
  if (Array.isArray(obj.share_network_subnets)) return raw
  const hasLegacyData = LEGACY_SUBNET_KEYS.some((key) => obj[key] != null)
  if (!hasLegacyData) return raw
  const subnet: Record<string, unknown> = {}
  for (const key of LEGACY_SUBNET_KEYS) {
    if (key in obj) subnet[key] = obj[key]
  }
  subnet.availability_zone = obj.availability_zone ?? null
  subnet.created_at = obj.created_at
  subnet.updated_at = obj.updated_at
  return { ...obj, share_network_subnets: [subnet] }
}

export const shareNetworkSchema = z.preprocess(
  normalizeShareNetwork,
  z.object({
    id: z.string().min(1),
    name: optionalText,
    description: optionalText,
    status: optionalText,
    project_id: optionalText,
    created_at: optionalText,
    updated_at: optionalText,
    share_network_subnets: z.array(shareNetworkSubnetSchema).nullish().catch(undefined),
  })
)

export const shareNetworkIdInputSchema = projectScopedInputSchema.extend({
  shareNetworkId: z.string().uuid(),
})

export type ShareNetwork = z.infer<typeof shareNetworkSchema>
export type ShareNetworkSubnet = z.infer<typeof shareNetworkSubnetSchema>
