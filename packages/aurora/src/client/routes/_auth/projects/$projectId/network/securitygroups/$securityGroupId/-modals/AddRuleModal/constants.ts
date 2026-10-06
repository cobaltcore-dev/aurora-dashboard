// Default CIDR values
export const DEFAULT_IPV4_CIDR = "0.0.0.0/0"
export const DEFAULT_IPV6_CIDR = "::/0"

// Custom rule type identifiers
export const CUSTOM_TCP_RULE = "custom-tcp"
export const CUSTOM_UDP_RULE = "custom-udp"
export const CUSTOM_ICMP_RULE = "custom-icmp"
export const OTHER_PROTOCOL_RULE = "other-protocol"

/**
 * Neutron matches protocol names case-insensitively and reads a protocol number as an integer, so "01" is ICMP.
 * Send and compare names trimmed and lowercased, and numbers without leading zeros.
 */
export const normalizeProtocol = (protocol: string | null): string | null => {
  const normalized = protocol?.trim().toLowerCase() || null
  return normalized && /^\d+$/.test(normalized) ? String(Number(normalized)) : normalized
}

/**
 * A protocol Neutron can accept: an IP protocol number 0-255, or a name such as "gre" or "ipv6-icmp".
 * Whether the name is one Neutron supports is left to Neutron, so the list here never goes stale.
 */
export const isValidProtocolFormat = (protocol: string): boolean => {
  if (/^\d+$/.test(protocol)) return Number(protocol) <= 255
  return /^[a-z][a-z0-9-]*$/.test(protocol)
}

// Neutron accepts a protocol as a name, as the legacy icmpv6 alias, or as an IANA number,
// so every spelling of ICMP has to be recognised before reading the port range fields.
const ICMP_PROTOCOLS = new Set(["icmp", "1", "ipv6-icmp", "icmpv6", "58"])

export const isIcmpProtocol = (protocol: string | null | undefined): boolean => {
  const normalized = normalizeProtocol(protocol ?? null)
  return normalized !== null && ICMP_PROTOCOLS.has(normalized)
}

/**
 * ICMP type/code can be set only where the user picks them: a custom ICMP rule, or "Other Protocol" with an ICMP
 * protocol. "All ICMP" leaves them empty, i.e. all types and codes.
 */
export const hasIcmpFields = (ruleType: string, protocol: string | null): boolean =>
  isIcmpProtocol(protocol) && [CUSTOM_ICMP_RULE, OTHER_PROTOCOL_RULE].includes(ruleType)

// Port modes
export const PORT_MODE_SINGLE = "single" as const
export const PORT_MODE_RANGE = "range" as const
export const PORT_MODE_ALL = "all" as const

// Validation ranges
export const PORT_MIN = 1
export const PORT_MAX = 65535
export const ICMP_MIN = 0
export const ICMP_MAX = 255

// Neutron DESCRIPTION_FIELD_SIZE (neutron_lib.db.constants)
export const RULE_DESCRIPTION_MAX_LENGTH = 255
