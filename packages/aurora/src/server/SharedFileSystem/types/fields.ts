import { z } from "zod"

export const optionalText = z.string().nullish().catch(undefined)
export const optionalSize = z.number().nonnegative().nullish().catch(undefined)
export const optionalInteger = z.number().int().nullish().catch(undefined)
export const optionalBoolean = z
  .union([z.boolean(), z.enum(["true", "false"])])
  .transform((value) => value === true || value === "true")
  .nullish()
  .catch(undefined)
export const metadataSchema = z.record(z.string(), z.string()).nullish().catch(undefined)
