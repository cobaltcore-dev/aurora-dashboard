import { DEFAULT_IPV4_CIDR } from "./constants"
import type { AddRuleFormValues } from "./validation/formSchema"

export const DEFAULT_VALUES: AddRuleFormValues = {
  ruleType: "",
  direction: "ingress",
  ethertype: "IPv4",
  description: "",
  protocol: null,
  portFrom: "",
  portTo: "",
  icmpType: "",
  icmpCode: "",
  remoteSourceType: "cidr",
  remoteCidr: DEFAULT_IPV4_CIDR,
  remoteSecurityGroupId: "",
}
