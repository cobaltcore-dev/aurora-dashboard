import type { CorsRuleRead } from "@/server/Storage/types/ceph"

/**
 * Convert CorsRuleRead (lenient read schema) to CorsRule (strict write schema)
 *
 * Safe because the data passed validation when read from the server.
 * The only difference is narrowing AllowedMethods from string[] to the specific enum array.
 */
export function toCorsRule(
  rule: CorsRuleRead
): CorsRuleRead & { AllowedMethods: Array<"GET" | "PUT" | "POST" | "DELETE" | "HEAD"> } {
  return {
    ...rule,
    AllowedMethods: rule.AllowedMethods as Array<"GET" | "PUT" | "POST" | "DELETE" | "HEAD">,
  }
}
