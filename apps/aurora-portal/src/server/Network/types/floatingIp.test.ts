import { describe, it, expect } from "vitest"
import {
  FloatingIpStatusSchema,
  PortDetailsSchema,
  PortForwardingSchema,
  FloatingIpSchema,
  FloatingIpResponseSchema,
  FloatingIpQueryParametersSchema,
  ISO8601TimestampSchema,
} from "./floatingIp"

describe("OpenStack Floating IP Schema Validation", () => {
  // Minimal valid objects
  const minimalValidFloatingIp = {
    id: "fip-123",
    router_id: null,
    revision_number: 1,
    project_id: "project-1",
    tenant_id: "tenant-1",
    floating_network_id: "net-external-1",
    fixed_ip_address: null,
    floating_ip_address: "203.0.113.10",
    port_id: null,
    status: "ACTIVE" as const,
  }

  const minimalValidPortDetails = {
    status: "ACTIVE" as const,
    name: "port-1",
    admin_state_up: true,
    network_id: "net-123",
    device_owner: "compute:nova",
    mac_address: "fa:16:3e:12:34:56",
    device_id: "instance-123",
  }

  const minimalValidPortForwarding = {
    id: "pf-123",
    protocol: "tcp" as const,
    internal_ip_address: "10.0.0.5",
  }

  // Complete valid objects
  const completeValidPortDetails = {
    status: "ACTIVE" as const,
    name: "instance-port",
    admin_state_up: true,
    network_id: "net-456",
    device_owner: "compute:nova",
    mac_address: "fa:16:3e:aa:bb:cc",
    device_id: "instance-456",
  }

  const completeValidPortForwarding = {
    id: "pf-456",
    protocol: "udp" as const,
    internal_ip_address: "10.0.0.10",
    internal_port: 3000,
    internal_port_range: "3000:4000",
    internal_port_id: "port-internal-1",
    external_port: 8080,
    external_port_range: "8080:9080",
    description: "Port forwarding for app server",
  }

  const completeValidFloatingIp = {
    id: "fip-456",
    router_id: "router-1",
    description: "Production floating IP",
    distributed: false,
    dns_domain: "example.com.",
    dns_name: "server1",
    created_at: "2025-01-15T10:00:00Z",
    updated_at: "2025-01-15T11:00:00Z",
    revision_number: 3,
    project_id: "project-1",
    tenant_id: "tenant-1",
    floating_network_id: "net-external-1",
    fixed_ip_address: "10.0.0.5",
    floating_ip_address: "203.0.113.25",
    port_id: "port-123",
    status: "ACTIVE" as const,
    port_details: completeValidPortDetails,
    tags: ["production", "web"],
    port_forwardings: [completeValidPortForwarding],
    qos_network_policy_id: "qos-net-1",
    qos_policy_id: "qos-1",
  }

  describe("ISO8601TimestampSchema", () => {
    it("should validate ISO8601 timestamp strings", () => {
      expect(ISO8601TimestampSchema.safeParse("2025-01-15T10:00:00Z").success).toBe(true)
      expect(ISO8601TimestampSchema.safeParse("2025-12-31T23:59:59Z").success).toBe(true)
    })

    it("should validate timestamps with milliseconds", () => {
      expect(ISO8601TimestampSchema.safeParse("2025-01-15T10:00:00.123Z").success).toBe(true)
    })

    it("should accept any string format (brand doesn't validate format)", () => {
      // Note: .brand() only brands the type, doesn't validate format
      expect(ISO8601TimestampSchema.safeParse("not-a-timestamp").success).toBe(true)
    })
  })

  describe("FloatingIpStatusSchema", () => {
    it("should validate ACTIVE status", () => {
      expect(FloatingIpStatusSchema.safeParse("ACTIVE").success).toBe(true)
    })

    it("should validate DOWN status", () => {
      expect(FloatingIpStatusSchema.safeParse("DOWN").success).toBe(true)
    })

    it("should validate ERROR status", () => {
      expect(FloatingIpStatusSchema.safeParse("ERROR").success).toBe(true)
    })

    it("should reject invalid status", () => {
      expect(FloatingIpStatusSchema.safeParse("INVALID").success).toBe(false)
      expect(FloatingIpStatusSchema.safeParse("active").success).toBe(false)
      expect(FloatingIpStatusSchema.safeParse("").success).toBe(false)
    })
  })

  describe("PortDetailsSchema", () => {
    it("should validate a minimal valid port details object", () => {
      expect(PortDetailsSchema.safeParse(minimalValidPortDetails).success).toBe(true)
    })

    it("should validate a complete valid port details object", () => {
      expect(PortDetailsSchema.safeParse(completeValidPortDetails).success).toBe(true)
    })

    it("should reject port details without required fields", () => {
      const result = PortDetailsSchema.safeParse({ status: "ACTIVE" })
      expect(result.success).toBe(false)
    })

    it("should validate all status values", () => {
      expect(PortDetailsSchema.safeParse({ ...minimalValidPortDetails, status: "DOWN" }).success).toBe(true)
      expect(PortDetailsSchema.safeParse({ ...minimalValidPortDetails, status: "ERROR" }).success).toBe(true)
    })

    it("should validate admin_state_up as boolean", () => {
      expect(PortDetailsSchema.safeParse({ ...minimalValidPortDetails, admin_state_up: true }).success).toBe(true)
      expect(PortDetailsSchema.safeParse({ ...minimalValidPortDetails, admin_state_up: false }).success).toBe(true)
    })

    it("should validate MAC address format", () => {
      const validMacs = ["fa:16:3e:12:34:56", "00:11:22:33:44:55", "FF:FF:FF:FF:FF:FF"]
      validMacs.forEach((mac) => {
        expect(PortDetailsSchema.safeParse({ ...minimalValidPortDetails, mac_address: mac }).success).toBe(true)
      })
    })
  })

  describe("PortForwardingSchema", () => {
    it("should validate a minimal valid port forwarding object", () => {
      expect(PortForwardingSchema.safeParse(minimalValidPortForwarding).success).toBe(true)
    })

    it("should validate a complete valid port forwarding object", () => {
      expect(PortForwardingSchema.safeParse(completeValidPortForwarding).success).toBe(true)
    })

    it("should reject port forwarding without required fields", () => {
      const result = PortForwardingSchema.safeParse({ protocol: "tcp" })
      expect(result.success).toBe(false)
    })

    it("should validate tcp protocol", () => {
      expect(PortForwardingSchema.safeParse({ ...minimalValidPortForwarding, protocol: "tcp" }).success).toBe(true)
    })

    it("should validate udp protocol", () => {
      expect(PortForwardingSchema.safeParse({ ...minimalValidPortForwarding, protocol: "udp" }).success).toBe(true)
    })

    it("should reject invalid protocol", () => {
      const result = PortForwardingSchema.safeParse({ ...minimalValidPortForwarding, protocol: "icmp" })
      expect(result.success).toBe(false)
    })

    it("should validate optional port numbers", () => {
      expect(
        PortForwardingSchema.safeParse({ ...minimalValidPortForwarding, internal_port: 22, external_port: 22 }).success
      ).toBe(true)
    })

    it("should validate optional port ranges", () => {
      expect(
        PortForwardingSchema.safeParse({
          ...minimalValidPortForwarding,
          internal_port_range: "1024:2048",
          external_port_range: "8000:9000",
        }).success
      ).toBe(true)
    })

    it("should validate optional internal_port_id", () => {
      expect(
        PortForwardingSchema.safeParse({ ...minimalValidPortForwarding, internal_port_id: "port-1" }).success
      ).toBe(true)
    })

    it("should validate optional description", () => {
      expect(PortForwardingSchema.safeParse({ ...minimalValidPortForwarding, description: "SSH access" }).success).toBe(
        true
      )
    })

    it("should validate null description", () => {
      expect(PortForwardingSchema.safeParse({ ...minimalValidPortForwarding, description: null }).success).toBe(true)
    })
  })

  describe("FloatingIpSchema", () => {
    it("should validate a minimal valid floating IP", () => {
      expect(FloatingIpSchema.safeParse(minimalValidFloatingIp).success).toBe(true)
    })

    it("should validate a complete valid floating IP", () => {
      expect(FloatingIpSchema.safeParse(completeValidFloatingIp).success).toBe(true)
    })

    it("should reject floating IP without required fields", () => {
      const result = FloatingIpSchema.safeParse({ id: "fip-1" })
      expect(result.success).toBe(false)
    })

    it("should reject floating IP without id", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...withoutId } = minimalValidFloatingIp
      const result = FloatingIpSchema.safeParse(withoutId)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path.includes("id"))).toBe(true)
      }
    })

    it("should validate null for nullable router_id", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, router_id: null }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, router_id: "router-1" }).success).toBe(true)
    })

    it("should validate null for nullable fixed_ip_address", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, fixed_ip_address: null }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, fixed_ip_address: "10.0.0.5" }).success).toBe(true)
    })

    it("should validate null for nullable port_id", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, port_id: null }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, port_id: "port-123" }).success).toBe(true)
    })

    it("should validate null for nullable port_details", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, port_details: null }).success).toBe(true)
      expect(
        FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, port_details: minimalValidPortDetails }).success
      ).toBe(true)
    })

    it("should allow port_details to be omitted (optional)", () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { port_details: _portDetails, ...withoutPortDetails } = { ...minimalValidFloatingIp, port_details: null }
      expect(FloatingIpSchema.safeParse(withoutPortDetails).success).toBe(true)
    })

    it("should validate null and undefined for nullable/optional description", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, description: null }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, description: "Test FIP" }).success).toBe(true)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { description: _description, ...withoutDescription } = { ...minimalValidFloatingIp, description: null }
      expect(FloatingIpSchema.safeParse(withoutDescription).success).toBe(true)
    })

    it("should validate all status values", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, status: "ACTIVE" }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, status: "DOWN" }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, status: "ERROR" }).success).toBe(true)
    })

    it("should validate empty arrays for tags and port_forwardings", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, tags: [] }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, port_forwardings: [] }).success).toBe(true)
    })

    it("should allow tags to be omitted (optional)", () => {
      const withoutTags = { ...minimalValidFloatingIp }
      expect(FloatingIpSchema.safeParse(withoutTags).success).toBe(true)
    })

    it("should validate nullish values for port_forwardings", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, port_forwardings: null }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, port_forwardings: undefined }).success).toBe(true)
      const withoutPortForwardings = { ...minimalValidFloatingIp }
      expect(FloatingIpSchema.safeParse(withoutPortForwardings).success).toBe(true)
    })

    it("should validate tags array with multiple values", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, tags: ["tag1", "tag2", "tag3"] }).success).toBe(
        true
      )
    })

    it("should validate port_forwardings array with multiple rules", () => {
      expect(
        FloatingIpSchema.safeParse({
          ...minimalValidFloatingIp,
          port_forwardings: [minimalValidPortForwarding, completeValidPortForwarding],
        }).success
      ).toBe(true)
    })

    it("should validate optional distributed field", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, distributed: true }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, distributed: false }).success).toBe(true)
    })

    it("should validate optional DNS fields", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, dns_domain: "example.com." }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, dns_name: "server1" }).success).toBe(true)
    })

    it("should validate optional timestamp fields", () => {
      expect(
        FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, created_at: "2025-01-15T10:00:00Z" }).success
      ).toBe(true)
      expect(
        FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, updated_at: "2025-01-15T11:00:00Z" }).success
      ).toBe(true)
    })

    it("should validate optional QoS fields", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, qos_policy_id: "qos-1" }).success).toBe(true)
      expect(
        FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, qos_network_policy_id: "qos-net-1" }).success
      ).toBe(true)
    })

    it("should validate revision_number as number", () => {
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, revision_number: 0 }).success).toBe(true)
      expect(FloatingIpSchema.safeParse({ ...minimalValidFloatingIp, revision_number: 100 }).success).toBe(true)
    })

    it("should validate floating IP with associated port and fixed IP", () => {
      const associated = {
        ...minimalValidFloatingIp,
        router_id: "router-1",
        port_id: "port-123",
        fixed_ip_address: "10.0.0.5",
        port_details: minimalValidPortDetails,
      }
      expect(FloatingIpSchema.safeParse(associated).success).toBe(true)
    })

    it("should validate floating IP in different states", () => {
      // Unassociated floating IP
      const unassociated = {
        ...minimalValidFloatingIp,
        router_id: null,
        port_id: null,
        fixed_ip_address: null,
        port_details: null,
        status: "DOWN" as const,
      }
      expect(FloatingIpSchema.safeParse(unassociated).success).toBe(true)

      // Associated floating IP
      const associated = {
        ...minimalValidFloatingIp,
        router_id: "router-1",
        port_id: "port-123",
        fixed_ip_address: "10.0.0.5",
        status: "ACTIVE" as const,
      }
      expect(FloatingIpSchema.safeParse(associated).success).toBe(true)

      // Error state floating IP
      const errorState = {
        ...minimalValidFloatingIp,
        status: "ERROR" as const,
      }
      expect(FloatingIpSchema.safeParse(errorState).success).toBe(true)
    })
  })

  describe("FloatingIpResponseSchema", () => {
    it("should validate list response with one floating IP", () => {
      expect(FloatingIpResponseSchema.safeParse({ floatingips: [minimalValidFloatingIp] }).success).toBe(true)
    })

    it("should validate list response with multiple floating IPs", () => {
      expect(
        FloatingIpResponseSchema.safeParse({
          floatingips: [minimalValidFloatingIp, completeValidFloatingIp],
        }).success
      ).toBe(true)
    })

    it("should validate empty floatingips array", () => {
      expect(FloatingIpResponseSchema.safeParse({ floatingips: [] }).success).toBe(true)
    })

    it("should reject response without floatingips key", () => {
      expect(FloatingIpResponseSchema.safeParse({}).success).toBe(false)
    })

    it("should reject response with null floatingips", () => {
      expect(FloatingIpResponseSchema.safeParse({ floatingips: null }).success).toBe(false)
    })

    it("should reject response with invalid floating IP in array", () => {
      const result = FloatingIpResponseSchema.safeParse({
        floatingips: [{ id: "fip-1" }], // Missing required fields
      })
      expect(result.success).toBe(false)
    })
  })

  describe("FloatingIpQueryParametersSchema", () => {
    it("should validate empty query parameters (all optional)", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({}).success).toBe(true)
    })

    it("should validate query with single filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ id: "fip-123" }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ floating_ip_address: "203.0.113.10" }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ status: "ACTIVE" }).success).toBe(true)
    })

    it("should validate query with multiple filters", () => {
      const query = {
        project_id: "project-1",
        floating_network_id: "net-external-1",
        status: "ACTIVE" as const,
      }
      expect(FloatingIpQueryParametersSchema.safeParse(query).success).toBe(true)
    })

    it("should validate nullable router_id filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ router_id: null }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ router_id: "router-1" }).success).toBe(true)
    })

    it("should validate nullable port_id filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ port_id: null }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ port_id: "port-123" }).success).toBe(true)
    })

    it("should validate sort parameters", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ sort_dir: "asc" }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ sort_dir: "desc" }).success).toBe(true)
    })

    it("should reject invalid sort_dir", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ sort_dir: "invalid" }).success).toBe(false)
    })

    it("should validate all sort_key options", () => {
      const validSortKeys = [
        "fixed_ip_address",
        "floating_ip_address",
        "floating_network_id",
        "id",
        "router_id",
        "status",
        "tenant_id",
        "project_id",
      ]
      validSortKeys.forEach((key) => {
        expect(FloatingIpQueryParametersSchema.safeParse({ sort_key: key }).success).toBe(true)
      })
    })

    it("should reject invalid sort_key", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ sort_key: "invalid_key" }).success).toBe(false)
    })

    it("should validate tag filters", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ tags: ["tag1", "tag2"] }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ "tags-any": "tag1,tag2" }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ "not-tags": "tag1,tag2" }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ "not-tags-any": "tag1,tag2" }).success).toBe(true)
    })

    it("should validate tags as array of strings", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ tags: [] }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ tags: ["production"] }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ tags: ["prod", "web", "critical"] }).success).toBe(true)
    })

    it("should validate nullable description filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ description: null }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ description: "Test" }).success).toBe(true)
    })

    it("should validate fields parameter as string", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ fields: "id,floating_ip_address" }).success).toBe(true)
    })

    it("should validate fields parameter as array", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ fields: ["id", "floating_ip_address"] }).success).toBe(true)
    })

    it("should validate pagination parameters", () => {
      const query = {
        limit: 50,
        marker: "fip-last",
        page_reverse: false,
      }
      expect(FloatingIpQueryParametersSchema.safeParse(query).success).toBe(true)
    })

    it("should validate page_reverse as boolean", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ page_reverse: true }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ page_reverse: false }).success).toBe(true)
    })

    it("should validate complete query with all parameters", () => {
      const query = {
        id: "fip-123",
        router_id: "router-1",
        status: "ACTIVE" as const,
        tenant_id: "tenant-1",
        project_id: "project-1",
        revision_number: 5,
        description: "Test FIP",
        floating_network_id: "net-external-1",
        fixed_ip_address: "10.0.0.5",
        floating_ip_address: "203.0.113.10",
        port_id: "port-123",
        sort_dir: "desc" as const,
        sort_key: "floating_ip_address" as const,
        tags: ["production", "web"],
        "tags-any": "dev,staging",
        "not-tags": "deprecated",
        "not-tags-any": "legacy",
        fields: ["id", "floating_ip_address", "status"],
        limit: 100,
        marker: "fip-marker",
        page_reverse: false,
      }
      expect(FloatingIpQueryParametersSchema.safeParse(query).success).toBe(true)
    })

    it("should validate status filter with all valid values", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ status: "ACTIVE" }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ status: "DOWN" }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ status: "ERROR" }).success).toBe(true)
    })

    it("should reject invalid status filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ status: "INVALID" }).success).toBe(false)
    })

    it("should validate revision_number as number", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ revision_number: 0 }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ revision_number: 999 }).success).toBe(true)
    })

    it("should validate limit as number", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ limit: 1 }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ limit: 1000 }).success).toBe(true)
    })

    it("should validate real-world filtering scenarios", () => {
      // Find unassociated floating IPs
      expect(
        FloatingIpQueryParametersSchema.safeParse({
          router_id: null,
          port_id: null,
          status: "DOWN" as const,
        }).success
      ).toBe(true)

      // Find floating IPs for specific project
      expect(
        FloatingIpQueryParametersSchema.safeParse({
          project_id: "project-1",
          sort_key: "created_at" as const,
          sort_dir: "desc" as const,
        }).success
      ).toBe(false) // created_at is not a valid sort_key

      // Find floating IPs by network
      expect(
        FloatingIpQueryParametersSchema.safeParse({
          floating_network_id: "net-external-1",
          limit: 50,
        }).success
      ).toBe(true)

      // Find active floating IPs with tags
      expect(
        FloatingIpQueryParametersSchema.safeParse({
          status: "ACTIVE" as const,
          tags: ["production"],
        }).success
      ).toBe(true)
    })
  })
})
