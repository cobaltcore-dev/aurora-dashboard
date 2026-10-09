import { z } from "zod"

/** ISO8601 timestamp string (UTC format) */
export const ISO8601TimestampSchema = z.string().brand("ISO8601Timestamp")

/** Sort direction (asc or desc) */
export const SortDirSchema = z.enum(["asc", "desc"])

export type ISO8601Timestamp = z.infer<typeof ISO8601TimestampSchema>
export type SortDir = z.infer<typeof SortDirSchema>

/** The network port status. Values are ACTIVE, DOWN, BUILD and ERROR. */
export const NetworkPortStatusSchema = z.enum(["ACTIVE", "DOWN", "BUILD", "ERROR"])

/* -------------------------------------------------------------------------- */
/*        Summary schemas for batched name lookups (shared by resources)       */
/* -------------------------------------------------------------------------- */

/** Reduced network schema, only the fields needed to label networks referenced by other resources. */
export const NetworkSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
})

export const NetworkSummaryListResponseSchema = z.object({
  networks: z.array(NetworkSummarySchema),
})

/** Reduced subnet schema, only the fields needed to label subnets referenced by other resources. */
export const SubnetSummarySchema = z.object({
  id: z.string(),
  name: z.string().optional().default(""),
  cidr: z.string().optional(),
})

export const SubnetSummaryListResponseSchema = z.object({
  subnets: z.array(SubnetSummarySchema),
})

/** Reduced security group schema, only the fields needed to label security groups referenced by ports. */
export const SecurityGroupSummarySchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
})

export const SecurityGroupSummaryListResponseSchema = z.object({
  security_groups: z.array(SecurityGroupSummarySchema),
})

export type NetworkSummary = z.infer<typeof NetworkSummarySchema>
export type SubnetSummary = z.infer<typeof SubnetSummarySchema>
export type SecurityGroupSummary = z.infer<typeof SecurityGroupSummarySchema>
