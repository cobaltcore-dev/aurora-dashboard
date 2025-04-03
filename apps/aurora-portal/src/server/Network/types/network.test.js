import { describe, it, expect } from "vitest"
import { networkSchema, networkResponseSchema, networksResponseSchema, createNetworkSchema } from "./network"

describe("OpenStack Network Schema Validation", () => {
  const minimalValidNetwork = {
    id: "net-12345",
  }

  const completeValidNetwork = {
    id: "net-12345",
    name: "private-network",
    description: "Network for internal communication",
    admin_state_up: true,
    status: "ACTIVE",
    subnets: ["subnet-1", "subnet-2"],
    tenant_id: "tenant-123456",
    project_id: "project-123456",
    shared: false,
    availability_zone_hints: ["az1", "az2"],
    availability_zones: ["az1"],
    ipv4_address_scope: "scope-ipv4",
    ipv6_address_scope: "scope-ipv6",
    "router:external": false,
    port_security_enabled: true,
    mtu: 1500,
    provider_network_type: "vxlan",
    provider_physical_network: "physnet1",
    provider_segmentation_id: 1001,
    segments: [
      {
        provider_network_type: "vxlan",
        provider_physical_network: "physnet1",
        provider_segmentation_id: 1001,
      },
    ],
    tags: ["tag1", "tag2"],
    revision_number: 3,
    created_at: "2025-03-15T10:00:00Z",
    updated_at: "2025-03-15T11:00:00Z",
    qos_policy_id: "qos-123",
    is_default: false,
    dns_domain: "example.com",
  }

  it("should validate a minimal valid network", () => {
    const result = networkSchema.safeParse(minimalValidNetwork)
    expect(result.success).toBe(true)
  })

  it("should validate a complete valid network", () => {
    const result = networkSchema.safeParse(completeValidNetwork)
    expect(result.success).toBe(true)
  })

  it("should reject a network without an id", () => {
    const invalidNetwork = { name: "invalid-network" }
    const result = networkSchema.safeParse(invalidNetwork)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("id")
    }
  })

  it("should validate null for optional string fields", () => {
    const network = {
      ...minimalValidNetwork,
      name: null,
      description: null,
      ipv4_address_scope: null,
      ipv6_address_scope: null,
      provider_network_type: null,
      provider_physical_network: null,
    }
    const result = networkSchema.safeParse(network)
    expect(result.success).toBe(true)
  })

  it("should validate with alternate external router field names", () => {
    // Test with 'router:external'
    const network1 = {
      ...minimalValidNetwork,
      "router:external": true,
    }
    const result1 = networkSchema.safeParse(network1)
    expect(result1.success).toBe(true)

    // Test with 'router_external'
    const network2 = {
      ...minimalValidNetwork,
      router_external: true,
    }
    const result2 = networkSchema.safeParse(network2)
    expect(result2.success).toBe(true)

    // Test with 'external'
    const network3 = {
      ...minimalValidNetwork,
      external: true,
    }
    const result3 = networkSchema.safeParse(network3)
    expect(result3.success).toBe(true)
  })

  it("should validate network with empty segments array", () => {
    const network = {
      ...minimalValidNetwork,
      segments: [],
    }
    const result = networkSchema.safeParse(network)
    expect(result.success).toBe(true)
  })

  it("should validate network with empty subnets array", () => {
    const network = {
      ...minimalValidNetwork,
      subnets: [],
    }
    const result = networkSchema.safeParse(network)
    expect(result.success).toBe(true)
  })

  it("should validate a single network response", () => {
    const response = {
      network: completeValidNetwork,
    }
    const result = networkResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it("should validate networks list response", () => {
    const response = {
      networks: [minimalValidNetwork, completeValidNetwork],
    }
    const result = networksResponseSchema.safeParse(response)
    expect(result.success).toBe(true)
  })

  it("should reject network response without network object", () => {
    const response = {}
    const result = networkResponseSchema.safeParse(response)
    expect(result.success).toBe(false)
  })

  it("should validate create network request with minimal fields", () => {
    const createRequest = {
      network: {
        name: "new-network",
      },
    }
    const result = createNetworkSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should validate create network request with complete fields", () => {
    const createRequest = {
      network: {
        name: "new-network",
        admin_state_up: true,
        shared: false,
        project_id: "project-123",
        "router:external": false,
        provider_network_type: "vxlan",
        provider_segmentation_id: 1001,
        port_security_enabled: true,
        mtu: 1500,
        description: "New network description",
      },
    }
    const result = createNetworkSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should validate create network request with segments", () => {
    const createRequest = {
      network: {
        name: "new-network",
        segments: [
          {
            provider_network_type: "vxlan",
            provider_physical_network: "physnet1",
            provider_segmentation_id: 1001,
          },
        ],
      },
    }
    const result = createNetworkSchema.safeParse(createRequest)
    expect(result.success).toBe(true)
  })

  it("should validate with unexpected extra properties", () => {
    const network = {
      ...minimalValidNetwork,
      some_future_property: "value",
      another_property: 123,
    }
    const result = networkSchema.safeParse(network)
    expect(result.success).toBe(true)
  })
})
