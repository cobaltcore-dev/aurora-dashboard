import { DEFAULT_IPV4_CIDR } from "./constants"

export interface AddRuleFormValues {
  ruleType: string
  direction: "ingress" | "egress"
  ethertype: "IPv4" | "IPv6"
  description: string
  protocol: string | null
  portMode: "single" | "range" | "all"
  portSingle: string
  portRangeMin: string
  portRangeMax: string
  icmpType: string
  icmpCode: string
  remoteSourceType: "cidr" | "security_group"
  remoteCidr: string
  remoteSecurityGroupId: string
}

export const DEFAULT_VALUES: AddRuleFormValues = {
  ruleType: "ssh",
  direction: "ingress",
  ethertype: "IPv4",
  description: "",
  protocol: "tcp",
  portMode: "single",
  portSingle: "22",
  portRangeMin: "22",
  portRangeMax: "22",
  icmpType: "",
  icmpCode: "",
  remoteSourceType: "cidr",
  remoteCidr: DEFAULT_IPV4_CIDR,
  remoteSecurityGroupId: "",
}
