import { z } from "zod"
import { validatePortRange, validateIcmpTypeCode, isValidCIDR, detectCIDRFamily } from "./validationHelpers"
import { CUSTOM_TCP_RULE, CUSTOM_UDP_RULE, OTHER_PROTOCOL_RULE, ICMP_MIN, ICMP_MAX } from "../constants"

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
    ruleType: z.string().min(1, "Rule type is required"),

    // Required fields - always present
    direction: z.enum(["ingress", "egress"]),
    ethertype: z.enum(["IPv4", "IPv6"]),

    // Optional description
    description: z.string(),

    // Protocol field - string for custom protocols, null for none
    protocol: z.string().nullable(),

    // Port-related fields (strings in form, converted to numbers during validation)
    portFrom: z.string(),
    portTo: z.string(),

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
      // Port (from) is always required
      if (!data.portFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Port (from) is required",
          path: ["portFrom"],
        })
      } else {
        const portFrom = parseInt(data.portFrom, 10)
        if (isNaN(portFrom)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Port must be a valid number",
            path: ["portFrom"],
          })
        } else {
          // If Port (to) is empty, validate portFrom as single port
          if (!data.portTo) {
            const result = validatePortRange(portFrom, portFrom, data.protocol)
            if (!result.valid) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: result.error || "Invalid port",
                path: ["portFrom"],
              })
            }
          } else {
            // Both ports are provided - validate as range
            const portTo = parseInt(data.portTo, 10)
            if (isNaN(portTo)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Port must be a valid number",
                path: ["portTo"],
              })
            } else {
              // Check that portFrom < portTo
              if (portFrom >= portTo) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: '"Port (from)" must be less than "Port (to)"',
                  path: ["portFrom"],
                })
              } else {
                // Validate the range
                const result = validatePortRange(portFrom, portTo, data.protocol)
                if (!result.valid) {
                  ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: result.error || "Invalid port range",
                    path: ["portFrom"],
                  })
                }
              }
            }
          }
        }
      }
    }

    // Validation 3: ICMP validation (only if ICMP protocol is selected)
    if (isIcmp) {
      // Parse values
      const icmpType = data.icmpType ? parseInt(data.icmpType, 10) : null
      const icmpCode = data.icmpCode ? parseInt(data.icmpCode, 10) : null

      // Step 1: Check for NaN values FIRST (early validation)
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

      // Step 2: Check OpenStack requirement (Type required when Code is specified)
      // https://opendev.org/openstack/neutron/src/branch/master/neutron/db/securitygroups_db.py
      if (data.icmpCode && !data.icmpType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "ICMP type is required when ICMP code is specified",
          path: ["icmpType"],
        })
      }

      // Step 3: Use helper function for range validation (0-255)
      // Now we know values are valid numbers (or null)
      if (icmpType !== null || icmpCode !== null) {
        const result = validateIcmpTypeCode(icmpType, icmpCode)
        if (!result.valid) {
          // Parse error message to target specific fields
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
