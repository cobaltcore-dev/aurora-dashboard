/**
 * Pure client-side CORS rule validation
 *
 * Validates CorsRuleRead[] against the structural requirements of corsRuleSchema
 * without importing server-side code (which would leak @trpc/server into the client bundle).
 */

import type { CorsRuleRead } from "@/server/Storage/types/ceph"

type AllowedMethod = "GET" | "PUT" | "POST" | "DELETE" | "HEAD"

interface ValidationResult {
  isValid: boolean
  errors: string[]
  validatedRules: Array<Omit<CorsRuleRead, "AllowedMethods"> & { AllowedMethods: AllowedMethod[] }>
}

/**
 * Validates an array of CORS rules against corsRuleSchema requirements
 *
 * Checks:
 * - At least one AllowedOrigin per rule
 * - At least one and at most 5 AllowedMethods per rule
 * - All AllowedMethods are from the allowed set
 * - No duplicate methods within a rule
 * - ID ≤ 255 chars if present
 * - Origins are valid URLs or '*'
 */
export function validateCorsRules(rules: CorsRuleRead[], allowedMethods: readonly string[]): ValidationResult {
  const errors: string[] = []
  const validatedRules: Array<Omit<CorsRuleRead, "AllowedMethods"> & { AllowedMethods: AllowedMethod[] }> = []

  if (rules.length === 0) {
    return { isValid: true, errors: [], validatedRules: [] }
  }

  if (rules.length > 100) {
    errors.push("Maximum of 100 CORS rules allowed")
  }

  rules.forEach((rule, index) => {
    const ruleErrors: string[] = []

    // Check ID length
    if (rule.ID && rule.ID.length > 255) {
      ruleErrors.push(`Rule ${index + 1}: ID must be at most 255 characters`)
    }

    // Check AllowedOrigins
    if (!rule.AllowedOrigins || rule.AllowedOrigins.length === 0) {
      ruleErrors.push(`Rule ${index + 1}: At least one AllowedOrigin is required`)
    } else {
      rule.AllowedOrigins.forEach((origin) => {
        if (origin !== "*") {
          try {
            new URL(origin)
          } catch {
            ruleErrors.push(`Rule ${index + 1}: Invalid origin URL "${origin}"`)
          }
        }
      })
    }

    // Check AllowedMethods
    if (!rule.AllowedMethods || rule.AllowedMethods.length === 0) {
      ruleErrors.push(`Rule ${index + 1}: At least one AllowedMethod is required`)
    } else if (rule.AllowedMethods.length > 5) {
      ruleErrors.push(`Rule ${index + 1}: Maximum of 5 AllowedMethods allowed`)
    } else {
      // Check all methods are valid
      const invalidMethods = rule.AllowedMethods.filter((method) => !allowedMethods.includes(method))
      if (invalidMethods.length > 0) {
        ruleErrors.push(`Rule ${index + 1}: Invalid methods: ${invalidMethods.join(", ")}`)
      }

      // Check for duplicates
      const uniqueMethods = new Set(rule.AllowedMethods)
      if (uniqueMethods.size !== rule.AllowedMethods.length) {
        ruleErrors.push(`Rule ${index + 1}: AllowedMethods must not contain duplicates`)
      }
    }

    // Check MaxAgeSeconds
    if (rule.MaxAgeSeconds !== undefined && rule.MaxAgeSeconds < 0) {
      ruleErrors.push(`Rule ${index + 1}: MaxAgeSeconds must be non-negative`)
    }

    if (ruleErrors.length > 0) {
      errors.push(...ruleErrors)
    } else {
      // If validation passed, we can safely narrow the AllowedMethods type
      validatedRules.push({
        ...rule,
        AllowedMethods: rule.AllowedMethods as AllowedMethod[],
      })
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    validatedRules,
  }
}
