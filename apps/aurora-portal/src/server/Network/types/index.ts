import { z } from "zod"

/** ISO8601 timestamp string (UTC format) */
export const ISO8601TimestampSchema = z.string().brand("ISO8601Timestamp")

/** Sort direction (asc or desc) */
export const SortDirSchema = z.enum(["asc", "desc"])

export type ISO8601Timestamp = z.infer<typeof ISO8601TimestampSchema>
export type SortDir = z.infer<typeof SortDirSchema>

/** The network port status. Values are ACTIVE, DOWN, BUILD and ERROR. */
export const NetworkPortStatusSchema = z.enum(["ACTIVE", "DOWN", "BUILD", "ERROR"])
