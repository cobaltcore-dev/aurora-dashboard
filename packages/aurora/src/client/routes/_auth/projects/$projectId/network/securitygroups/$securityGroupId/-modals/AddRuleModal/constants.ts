// Default CIDR values
export const DEFAULT_IPV4_CIDR = "0.0.0.0/0"
export const DEFAULT_IPV6_CIDR = "::/0"

// Custom rule type identifiers
export const CUSTOM_TCP_RULE = "custom-tcp"
export const CUSTOM_UDP_RULE = "custom-udp"
export const OTHER_PROTOCOL_RULE = "other-protocol"

// Port modes
export const PORT_MODE_SINGLE = "single" as const
export const PORT_MODE_RANGE = "range" as const
export const PORT_MODE_ALL = "all" as const

// Validation ranges
export const PORT_MIN = 1
export const PORT_MAX = 65535
export const ICMP_MIN = 0
export const ICMP_MAX = 255
