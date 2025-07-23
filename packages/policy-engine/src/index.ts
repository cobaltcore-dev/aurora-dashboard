import { PolicyEngine } from "./policyEngine"
import { loadPolicyConfigFromFile } from "./policyFileLoader"
import { PolicyConfigSchema } from "./policyEngine"
import { z } from "zod"

export const StringRecordSchema = z.record(z.string(), z.string())
type StringRecord = z.infer<typeof StringRecordSchema>

/**
 * Creates a PolicyEngine from a configuration object
 */
export function createPolicyEngine(config: StringRecord): PolicyEngine {
  const validatedConfig = PolicyConfigSchema.parse(config)
  return new PolicyEngine(validatedConfig)
}

/**
 * Creates a PolicyEngine from a configuration file
 */
export function createPolicyEngineFromFile(policyFilePath: string): PolicyEngine {
  const config = loadPolicyConfigFromFile(policyFilePath)
  const validatedConfig = PolicyConfigSchema.parse(config)
  return new PolicyEngine(validatedConfig)
}
