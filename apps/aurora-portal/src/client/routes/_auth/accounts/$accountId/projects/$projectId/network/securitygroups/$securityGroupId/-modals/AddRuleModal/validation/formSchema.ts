import { z } from "zod"
import { validatePortRange, validateIcmpTypeCode, isValidCIDR, detectCIDRFamily } from "./validationHelpers"
import {
  CUSTOM_TCP_RULE,
  CUSTOM_UDP_RULE,
  OTHER_PROTOCOL_RULE,
  PORT_MODE_SINGLE,
  PORT_MODE_RANGE,
  ICMP_MIN,
  ICMP_MAX,
} from "../constants"

/**
 * Zod schema for AddRuleModal form validation.
 *
 * This schema validates all fields in the Add Rule form with conditional validation
 * based on protocol type, rule type, and other field dependencies.
 *
 * All validation logic is performed on the frontend to provide immediate feedback
 * and reduce server roundtrips. The backend only performs type checking.
 */
export const createRuleFormSchema = z
  .object({
    // Rule preset selector (UI only, affects which fields are populated)
    ruleType: z.string(),

    // Required fields - always present
    direction: z.enum(["ingress", "egress"]),
    ethertype: z.enum(["IPv4", "IPv6"]),

    // Optional description
    description: z.string(),

    // Protocol field - string for custom protocols, null for none
    protocol: z.string().nullable(),

    // Port-related fields (strings in form, converted to numbers during validation)
    portMode: z.enum(["single", "range", "all"]),
    portSingle: z.string(),
    portRangeMin: z.string(),
    portRangeMax: z.string(),

    // ICMP fields (strings in form, converted to numbers during validation)
    icmpType: z.string(),
    icmpCode: z.string(),

    // Remote source configuration
    remoteSourceType: z.enum(["cidr", "security_group"]),
    remoteCidr: z.string(),
    remoteSecurityGroupId: z.string(),
  })
  .superRefine((data, ctx) => {
    // Determine which validations apply based on protocol and rule type
    const isTcpUdp = data.protocol === "tcp" || data.protocol === "udp"
    const isIcmp = data.protocol === "icmp" || data.protocol === "ipv6-icmp"
    const isCustomProtocol = data.ruleType === OTHER_PROTOCOL_RULE
    const showPortFields = isTcpUdp && [CUSTOM_TCP_RULE, CUSTOM_UDP_RULE].includes(data.ruleType)

    // Validation 1: Protocol is required for "other-protocol" rule type
    if (isCustomProtocol && !data.protocol) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Protocol is required",
        path: ["protocol"],
      })
    }

    // Validation 2: Port validation (only if port fields are visible)
    if (showPortFields) {
      if (data.portMode === PORT_MODE_SINGLE) {
        // Validate single port
        if (!data.portSingle) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Port is required",
            path: ["portSingle"],
          })
        } else {
          const port = parseInt(data.portSingle, 10)
          if (isNaN(port)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Port must be a valid number",
              path: ["portSingle"],
            })
          } else {
            const result = validatePortRange(port, port, data.protocol)
            if (!result.valid) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: result.error || "Invalid port",
                path: ["portSingle"],
              })
            }
          }
        }
      } else if (data.portMode === PORT_MODE_RANGE) {
        // Validate port range
        const minPort = data.portRangeMin ? parseInt(data.portRangeMin, 10) : null
        const maxPort = data.portRangeMax ? parseInt(data.portRangeMax, 10) : null

        // Check for NaN on individual fields first
        if (data.portRangeMin && isNaN(minPort!)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Port must be a valid number",
            path: ["portRangeMin"],
          })
        }
        if (data.portRangeMax && isNaN(maxPort!)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Port must be a valid number",
            path: ["portRangeMax"],
          })
        }

        // Only run range validation if both are valid numbers
        if (minPort !== null && maxPort !== null && !isNaN(minPort) && !isNaN(maxPort)) {
          const result = validatePortRange(minPort, maxPort, data.protocol)
          if (!result.valid) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: result.error || "Invalid port range",
              path: ["portRangeMin"],
            })
          }
        }
      }
      // PORT_MODE_ALL doesn't need validation (always 1-65535)
    }

    // Validation 3: ICMP validation (only if ICMP protocol is selected)
    if (isIcmp) {
      const icmpType = data.icmpType ? parseInt(data.icmpType, 10) : null
      const icmpCode = data.icmpCode ? parseInt(data.icmpCode, 10) : null

      // Check for NaN values
      if (data.icmpType && isNaN(icmpType!)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ICMP type must be a valid number",
          path: ["icmpType"],
        })
      }
      if (data.icmpCode && isNaN(icmpCode!)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ICMP code must be a valid number",
          path: ["icmpCode"],
        })
      }

      // Only validate ranges if values are valid numbers
      if (icmpType !== null || icmpCode !== null) {
        const result = validateIcmpTypeCode(icmpType, icmpCode)
        if (!result.valid) {
          // The shared function provides error messages - parse them to target specific fields
          if (result.error?.includes("type")) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `ICMP type must be between ${ICMP_MIN} and ${ICMP_MAX}`,
              path: ["icmpType"],
            })
          }
          if (result.error?.includes("code")) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `ICMP code must be between ${ICMP_MIN} and ${ICMP_MAX}`,
              path: ["icmpCode"],
            })
          }
          // Fallback for generic errors
          if (!result.error?.includes("type") && !result.error?.includes("code")) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: result.error || "Invalid ICMP type/code",
              path: ["icmpType"],
            })
          }
        }
      }
    }

    // Validation 4: CIDR validation (only if CIDR remote source is selected)
    if (data.remoteSourceType === "cidr" && data.remoteCidr) {
      // Validate CIDR format
      if (!isValidCIDR(data.remoteCidr)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid CIDR format. Examples: 0.0.0.0/0 (IPv4) or ::/0 (IPv6)",
          path: ["remoteCidr"],
        })
      } else {
        // Validate ethertype matches CIDR family
        const cidrFamily = detectCIDRFamily(data.remoteCidr)
        if (cidrFamily && cidrFamily !== data.ethertype) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `CIDR family (${cidrFamily}) must match Ethertype (${data.ethertype})`,
            path: ["remoteCidr"],
          })
        }
      }
    }
  })

/**
 * Type definition inferred from the Zod schema.
 * This ensures type safety between form values and validation schema.
 */
export type AddRuleFormValues = z.infer<typeof createRuleFormSchema>
