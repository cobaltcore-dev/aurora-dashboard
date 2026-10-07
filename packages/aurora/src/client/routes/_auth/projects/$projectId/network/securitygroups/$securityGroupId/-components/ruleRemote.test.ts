import { describe, it, expect } from "vitest"
import type { SecurityGroupRule } from "@/server/Network/types/securityGroup"
import { getRuleRemote } from "./ruleRemote"

const rule = (fields: Partial<SecurityGroupRule>): SecurityGroupRule => ({
  id: "rule-1",
  direction: "ingress",
  ethertype: "IPv4",
  ...fields,
})

const groups = [
  { id: "sg-web", name: "web" },
  { id: "sg-db", name: "db (this group)" },
]

describe("getRuleRemote", () => {
  it("returns the CIDR of an IP prefix remote", () => {
    expect(getRuleRemote(rule({ remote_ip_prefix: "10.0.0.0/24" }), groups)).toEqual({
      kind: "cidr",
      cidr: "10.0.0.0/24",
    })
  })

  it("resolves a remote group to its name", () => {
    expect(getRuleRemote(rule({ remote_group_id: "sg-web" }), groups)).toEqual({
      kind: "group",
      id: "sg-web",
      name: "web",
    })
  })

  it("leaves the name empty for a remote group outside the list", () => {
    expect(getRuleRemote(rule({ remote_group_id: "sg-other" }), groups)).toEqual({
      kind: "group",
      id: "sg-other",
      name: null,
    })
  })

  it("returns an address group remote", () => {
    expect(getRuleRemote(rule({ remote_address_group_id: "ag-1" }), groups)).toEqual({
      kind: "address_group",
      id: "ag-1",
    })
  })

  it("treats a rule without a remote as open to any address", () => {
    expect(getRuleRemote(rule({ remote_ip_prefix: null, remote_group_id: null }), groups)).toEqual({ kind: "any" })
  })
})
