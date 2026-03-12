import { describe, expect, it } from "vitest"
import {
  ListDnsDomainsQuerySchema,
  ListExternalNetworksQuerySchema,
  ListNetworksQuerySchema,
  NetworkDnsDomainListResponseSchema,
  NetworkListResponseSchema,
  NetworkSchema,
} from "./network"

describe("Network query schemas", () => {
  describe("ListNetworksQuerySchema", () => {
    it("should validate empty query", () => {
      const result = ListNetworksQuerySchema.safeParse({})

      expect(result.success).toBe(true)
    })

    it("should validate a query with common filters", () => {
      const result = ListNetworksQuerySchema.safeParse({
        id: "network-1",
        name: "public-network",
        admin_state_up: true,
        mtu: 1500,
        project_id: "project-1",
        "provider:network_type": "vxlan",
        "provider:physical_network": "physnet1",
        "provider:segmentation_id": 100,
        "router:external": true,
        shared: true,
        status: "ACTIVE",
        tenant_id: "tenant-1",
        vlan_transparent: false,
        description: "Public network",
        is_default: false,
        tags: "production",
        "tags-any": "prod,shared",
        "not-tags": "deprecated",
        "not-tags-any": "temp,test",
        sort_dir: "asc",
        sort_key: "name",
        fields: "id",
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data["router:external"]).toBe(true)
        expect(result.data["provider:segmentation_id"]).toBe(100)
      }
    })

    it("should reject invalid sort_dir", () => {
      const result = ListNetworksQuerySchema.safeParse({ sort_dir: "invalid" })

      expect(result.success).toBe(false)
    })

    it("should reject non-integer mtu", () => {
      const result = ListNetworksQuerySchema.safeParse({ mtu: 1500.5 })

      expect(result.success).toBe(false)
    })

    it("should reject non-boolean router external flag", () => {
      const result = ListNetworksQuerySchema.safeParse({ "router:external": "true" })

      expect(result.success).toBe(false)
    })
  })

  describe("ListExternalNetworksQuerySchema", () => {
    it("should default router:external to true when omitted", () => {
      const result = ListExternalNetworksQuerySchema.safeParse({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data["router:external"]).toBe(true)
      }
    })

    it("should validate when router:external is explicitly true", () => {
      const result = ListExternalNetworksQuerySchema.safeParse({ "router:external": true })

      expect(result.success).toBe(true)
    })

    it("should reject router:external when false", () => {
      const result = ListExternalNetworksQuerySchema.safeParse({ "router:external": false })

      expect(result.success).toBe(false)
    })

    it("should keep other list filters available", () => {
      const result = ListExternalNetworksQuerySchema.safeParse({
        name: "external-net",
        project_id: "project-1",
        sort_dir: "desc",
        sort_key: "name",
        fields: "id",
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data["router:external"]).toBe(true)
        expect(result.data.name).toBe("external-net")
      }
    })
  })

  describe("ListDnsDomainsQuerySchema", () => {
    it("should validate empty query", () => {
      const result = ListDnsDomainsQuerySchema.safeParse({})

      expect(result.success).toBe(true)
    })

    it("should validate supported filters", () => {
      const result = ListDnsDomainsQuerySchema.safeParse({
        project_id: "project-1",
        tenant_id: "tenant-1",
        "router:external": true,
      })

      expect(result.success).toBe(true)
    })

    it("should reject non-boolean router external flag", () => {
      const result = ListDnsDomainsQuerySchema.safeParse({ "router:external": "true" })

      expect(result.success).toBe(false)
    })
  })

  describe("NetworkSchema", () => {
    const validNetwork = {
      admin_state_up: true,
      created_at: "2026-03-10T10:00:00Z",
      id: "network-1",
      mtu: 1500,
      name: "public-network",
      port_security_enabled: true,
      project_id: "project-1",
      "provider:network_type": "vxlan",
      "provider:physical_network": "physnet1",
      "provider:segmentation_id": 100,
      revision_number: 1,
      "router:external": true,
      segments: [
        {
          "provider:network_type": "vxlan",
          "provider:physical_network": "physnet1",
          "provider:segmentation_id": 100,
        },
      ],
      shared: true,
      status: "ACTIVE" as const,
      subnets: ["subnet-1"],
      tenant_id: "tenant-1",
      updated_at: "2026-03-10T11:00:00Z",
      vlan_transparent: false,
      description: "External shared network",
      is_default: false,
      tags: ["production", "shared"],
    }

    it("should validate a complete network object", () => {
      const result = NetworkSchema.safeParse(validNetwork)

      expect(result.success).toBe(true)
    })

    it("should validate with only required fields", () => {
      const result = NetworkSchema.safeParse({
        admin_state_up: true,
        created_at: "2026-03-10T10:00:00Z",
        id: "network-2",
        mtu: 1450,
        name: "private-network",
        port_security_enabled: true,
        project_id: "project-1",
        "router:external": false,
        shared: false,
        status: "DOWN",
        tenant_id: "tenant-1",
      })

      expect(result.success).toBe(true)
    })

    it("should reject invalid status", () => {
      const result = NetworkSchema.safeParse({ ...validNetwork, status: "INVALID" })

      expect(result.success).toBe(false)
    })

    it("should reject non-integer segmentation id in segments", () => {
      const result = NetworkSchema.safeParse({
        ...validNetwork,
        segments: [
          {
            "provider:network_type": "vxlan",
            "provider:physical_network": "physnet1",
            "provider:segmentation_id": 100.5,
          },
        ],
      })

      expect(result.success).toBe(false)
    })
  })

  describe("NetworkListResponseSchema", () => {
    const validNetwork = {
      admin_state_up: true,
      created_at: "2026-03-10T10:00:00Z",
      id: "network-1",
      mtu: 1500,
      name: "public-network",
      port_security_enabled: true,
      project_id: "project-1",
      "router:external": true,
      shared: true,
      status: "ACTIVE" as const,
      tenant_id: "tenant-1",
    }

    it("should validate response with multiple networks", () => {
      const result = NetworkListResponseSchema.safeParse({
        networks: [
          validNetwork,
          { ...validNetwork, id: "network-2", name: "private-network", "router:external": false },
        ],
      })

      expect(result.success).toBe(true)
    })

    it("should validate empty network list", () => {
      const result = NetworkListResponseSchema.safeParse({ networks: [] })

      expect(result.success).toBe(true)
    })

    it("should reject response without networks key", () => {
      const result = NetworkListResponseSchema.safeParse({})

      expect(result.success).toBe(false)
    })

    it("should reject response when one network entry is invalid", () => {
      const result = NetworkListResponseSchema.safeParse({
        networks: [validNetwork, { ...validNetwork, id: 123 }],
      })

      expect(result.success).toBe(false)
    })
  })

  describe("NetworkDnsDomainListResponseSchema", () => {
    it("should validate response with dns_domain values", () => {
      const result = NetworkDnsDomainListResponseSchema.safeParse({
        networks: [{ dns_domain: "example.org." }, { dns_domain: "corp.local" }],
      })

      expect(result.success).toBe(true)
    })

    it("should validate response when dns_domain is missing", () => {
      const result = NetworkDnsDomainListResponseSchema.safeParse({
        networks: [{}, { dns_domain: "example.org." }],
      })

      expect(result.success).toBe(true)
    })

    it("should reject response without networks key", () => {
      const result = NetworkDnsDomainListResponseSchema.safeParse({})

      expect(result.success).toBe(false)
    })
  })
})
