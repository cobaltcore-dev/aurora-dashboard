import { useLingui } from "@lingui/react/macro"
import type { SecurityGroupRule } from "@/server/Network/types/securityGroup"

export interface SecurityGroupOption {
  id: string
  name: string | null
}

/** The traffic peer of a rule: the source of ingress traffic or the destination of egress traffic */
export type RuleRemote =
  | { kind: "cidr"; cidr: string }
  // `name` is null when the group is not among the project's groups, e.g. it belongs to another project
  | { kind: "group"; id: string; name: string | null }
  | { kind: "address_group"; id: string }
  | { kind: "any" }

// Neutron allows at most one of the three remote fields on a rule, so the order of the checks does not matter
export function getRuleRemote(rule: SecurityGroupRule, securityGroups: SecurityGroupOption[]): RuleRemote {
  if (rule.remote_ip_prefix) return { kind: "cidr", cidr: rule.remote_ip_prefix }
  if (rule.remote_group_id) {
    const id = rule.remote_group_id
    return { kind: "group", id, name: securityGroups.find((sg) => sg.id === id)?.name ?? null }
  }
  if (rule.remote_address_group_id) return { kind: "address_group", id: rule.remote_address_group_id }
  return { kind: "any" }
}

/** Plain-text form of a rule's remote, as shown in the rules table and the delete dialog */
export function useFormatRuleRemote() {
  const { t } = useLingui()

  return (remote: RuleRemote): string => {
    switch (remote.kind) {
      case "cidr":
        return remote.cidr
      case "group":
        return remote.name || remote.id
      case "address_group": {
        const { id } = remote
        return t`Address group: ${id}`
      }
      case "any":
        return t`Any`
    }
  }
}
