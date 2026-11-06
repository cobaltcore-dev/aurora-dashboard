import { describe, it, expect } from "vitest"
import {
  NetworkSchema,
  NetworkListResponseSchema,
  NetworkResponseSchema,
  NetworkTagsResponseSchema,
  NetworkSubnetSchema,
  NetworkSubnetListResponseSchema,
  NetworkQueryParametersSchema,
  NetworkIdInputSchema,
  NetworkCreateRequestSchema,
  NetworkUpdateRequestSchema,
  NetworkSetTagsRequestSchema,
} from "./network"

const minimalNetwork = {
  id: "net-1",
  status: "ACTIVE",
  admin_state_up: true,
  project_id: "proj-1",
}

const completeNetwork = {
  ...minimalNetwork,
  name: "private",
  description: "App tier",
  shared: false,
  subnets: ["subnet-1", "subnet-2"],
  tenant_id: "proj-1",
  mtu: 8950,
  "router:external": false,
  port_security_enabled: true,
  qos_policy_id: null,
  dns_domain: "",
  ipv4_address_scope: null,
  ipv6_address_scope: null,
  is_default: false,
  vlan_transparent: null,
  l2_adjacency: true,
  availability_zone_hints: [],
  availability_zones: ["qa-de-1a"],
  "provider:network_type": "vxlan",
  "provider:physical_network": null,
  "provider:segmentation_id": 1234,
  revision_number: 3,
  tags: ["env:prod"],
  created_at: "2025-02-28T14:36:21Z",
  updated_at: "2025-03-01T10:00:00Z",
}

describe("NetworkSchema", () => {
  it("parses a minimal network and applies defaults", () => {
    const result = NetworkSchema.safeParse(minimalNetwork)

    expect(result.success).toBe(true)
    expect(result.data).toMatchObject({ name: "", description: "", shared: false, subnets: [] })
  })

  it("parses a complete network", () => {
    const result = NetworkSchema.safeParse(completeNetwork)

    expect(result.success).toBe(true)
    expect(result.data?.["router:external"]).toBe(false)
    expect(result.data?.mtu).toBe(8950)
  })

  it("accepts null for extension fields", () => {
    const result = NetworkSchema.safeParse({
      ...minimalNetwork,
      mtu: null,
      "router:external": null,
      port_security_enabled: null,
      "provider:segmentation_id": null,
    })

    expect(result.success).toBe(true)
  })

  it("accepts unknown status values", () => {
    expect(NetworkSchema.safeParse({ ...minimalNetwork, status: "DEGRADED" }).success).toBe(true)
  })

  it.each(["id", "status", "admin_state_up", "project_id"])("rejects a network without %s", (field) => {
    const network: Record<string, unknown> = { ...minimalNetwork }
    delete network[field]

    expect(NetworkSchema.safeParse(network).success).toBe(false)
  })
})

describe("Network envelopes", () => {
  it("parses the list envelope", () => {
    expect(NetworkListResponseSchema.safeParse({ networks: [minimalNetwork, completeNetwork] }).success).toBe(true)
    expect(NetworkListResponseSchema.safeParse({ networks: [] }).success).toBe(true)
    expect(NetworkListResponseSchema.safeParse({}).success).toBe(false)
  })

  it("parses the single envelope", () => {
    expect(NetworkResponseSchema.safeParse({ network: completeNetwork }).success).toBe(true)
    expect(NetworkResponseSchema.safeParse({ networks: [completeNetwork] }).success).toBe(false)
  })

  it("parses the tags envelope", () => {
    expect(NetworkTagsResponseSchema.safeParse({ tags: ["a", "b"] }).data).toEqual({ tags: ["a", "b"] })
    expect(NetworkTagsResponseSchema.safeParse({}).success).toBe(false)
  })
})

describe("NetworkSubnetSchema", () => {
  it("parses a subnet", () => {
    const result = NetworkSubnetListResponseSchema.safeParse({
      subnets: [
        { id: "subnet-1", name: "v4", cidr: "10.0.0.0/24", ip_version: 4, gateway_ip: "10.0.0.1", enable_dhcp: true },
        { id: "subnet-2", cidr: "fd00::/64", ip_version: 6, gateway_ip: null },
      ],
    })

    expect(result.success).toBe(true)
    expect(result.data?.subnets[1].name).toBe("")
  })

  it("rejects a subnet without cidr", () => {
    expect(NetworkSubnetSchema.safeParse({ id: "subnet-1", ip_version: 4 }).success).toBe(false)
  })
})

describe("NetworkQueryParametersSchema", () => {
  it("accepts project_id only", () => {
    expect(NetworkQueryParametersSchema.safeParse({ project_id: "proj-1" }).success).toBe(true)
  })

  it("accepts all filters", () => {
    const result = NetworkQueryParametersSchema.safeParse({
      project_id: "proj-1",
      name: "private",
      description: "app",
      status: "ACTIVE",
      admin_state_up: true,
      shared: false,
      "router:external": false,
      mtu: 1500,
      sort_key: "name",
      sort_dir: "desc",
      tags: "a,b",
      tags_any: "c",
      not_tags: "d",
      not_tags_any: "e",
      searchTerm: " web ",
    })

    expect(result.success).toBe(true)
    expect(result.data?.searchTerm).toBe("web")
  })

  it("rejects an unsupported sort key", () => {
    expect(NetworkQueryParametersSchema.safeParse({ project_id: "proj-1", sort_key: "subnets" }).success).toBe(false)
  })

  it("requires project_id", () => {
    expect(NetworkQueryParametersSchema.safeParse({}).success).toBe(false)
  })
})

describe("NetworkIdInputSchema", () => {
  it("requires a non-empty network_id", () => {
    expect(NetworkIdInputSchema.safeParse({ project_id: "proj-1", network_id: "net-1" }).success).toBe(true)
    expect(NetworkIdInputSchema.safeParse({ project_id: "proj-1", network_id: "  " }).success).toBe(false)
    expect(NetworkIdInputSchema.safeParse({ project_id: "proj-1" }).success).toBe(false)
  })
})

describe("NetworkCreateRequestSchema", () => {
  it("accepts a name only", () => {
    expect(NetworkCreateRequestSchema.safeParse({ project_id: "proj-1", name: "private" }).success).toBe(true)
  })

  it("accepts all fields", () => {
    const result = NetworkCreateRequestSchema.safeParse({
      project_id: "proj-1",
      name: "private",
      description: "App tier",
      admin_state_up: false,
      port_security_enabled: true,
      mtu: 1500,
      shared: true,
      "router:external": false,
      availability_zone_hints: ["qa-de-1a"],
    })

    expect(result.success).toBe(true)
  })

  it.each([
    ["an empty name", { name: "  " }],
    ["a name over 255 characters", { name: "a".repeat(256) }],
    ["a description over 255 characters", { name: "n", description: "a".repeat(256) }],
    ["an MTU below 68", { name: "n", mtu: 67 }],
    ["a non-integer MTU", { name: "n", mtu: 1500.5 }],
    ["an empty availability zone hint", { name: "n", availability_zone_hints: [""] }],
  ])("rejects %s", (_label, fields) => {
    expect(NetworkCreateRequestSchema.safeParse({ project_id: "proj-1", ...fields }).success).toBe(false)
  })
})

describe("NetworkUpdateRequestSchema", () => {
  it("accepts a partial update", () => {
    expect(
      NetworkUpdateRequestSchema.safeParse({ project_id: "proj-1", network_id: "net-1", admin_state_up: false }).success
    ).toBe(true)
  })

  it("allows clearing the name", () => {
    expect(NetworkUpdateRequestSchema.safeParse({ project_id: "proj-1", network_id: "net-1", name: "" }).success).toBe(
      true
    )
  })

  it("requires network_id", () => {
    expect(NetworkUpdateRequestSchema.safeParse({ project_id: "proj-1", name: "x" }).success).toBe(false)
  })
})

describe("NetworkSetTagsRequestSchema", () => {
  it("accepts tags and an empty list", () => {
    expect(
      NetworkSetTagsRequestSchema.safeParse({ project_id: "proj-1", network_id: "net-1", tags: ["env:prod"] }).success
    ).toBe(true)
    expect(NetworkSetTagsRequestSchema.safeParse({ project_id: "proj-1", network_id: "net-1", tags: [] }).success).toBe(
      true
    )
  })

  it.each([
    ["an empty tag", ""],
    ["a tag over 255 characters", "a".repeat(256)],
    ["a tag with a comma", "a,b"],
  ])("rejects %s", (_label, tag) => {
    expect(
      NetworkSetTagsRequestSchema.safeParse({ project_id: "proj-1", network_id: "net-1", tags: [tag] }).success
    ).toBe(false)
  })

  it("requires tags", () => {
    expect(NetworkSetTagsRequestSchema.safeParse({ project_id: "proj-1", network_id: "net-1" }).success).toBe(false)
  })
})
