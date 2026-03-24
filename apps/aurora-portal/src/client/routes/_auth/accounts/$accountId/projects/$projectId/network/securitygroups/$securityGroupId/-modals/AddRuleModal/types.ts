import { DEFAULT_IPV4_CIDR } from "./constants"

export interface AddRuleFormValues {
  ruleType: string
  direction: "ingress" | "egress"
  ethertype: "IPv4" | "IPv6"
  description: string
  protocol: string | null
  portFrom: string
  portTo: string
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
  portFrom: "",
  portTo: "",
  icmpType: "",
  icmpCode: "",
  remoteSourceType: "cidr",
  remoteCidr: DEFAULT_IPV4_CIDR,
  remoteSecurityGroupId: "",
}
