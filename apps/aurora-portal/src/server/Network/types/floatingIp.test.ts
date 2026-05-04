import { describe, it, expect } from "vitest"
import {
  FloatingIpStatusSchema,
  PortDetailsSchema,
  PortForwardingSchema,
  FloatingIpSchema,
  FloatingIpCreateRequestSchema,
  FloatingIpUpdateRequestSchema,
  FloatingIpIdInputSchema,
  FloatingIpListResponseSchema,
  FloatingIpResponseSchema,
  FloatingIpQueryParametersSchema,
  ExternalNetworksQuerySchema,
  ExternalNetworkSchema,
  ExternalNetworksResponseSchema,
  AvailablePortsQuerySchema,
  AvailablePortSchema,
  AvailablePortsResponseSchema,
} from "./floatingIp"
import { ISO8601TimestampSchema } from "./index"

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

  describe("FloatingIpListResponseSchema", () => {
    it("should validate list response with one floating IP", () => {
      expect(FloatingIpListResponseSchema.safeParse({ floatingips: [minimalValidFloatingIp] }).success).toBe(true)
    })

    it("should validate list response with multiple floating IPs", () => {
      expect(
        FloatingIpListResponseSchema.safeParse({
          floatingips: [minimalValidFloatingIp, completeValidFloatingIp],
        }).success
      ).toBe(true)
    })

    it("should validate empty floatingips array", () => {
      expect(FloatingIpListResponseSchema.safeParse({ floatingips: [] }).success).toBe(true)
    })

    it("should reject response without floatingips key", () => {
      expect(FloatingIpListResponseSchema.safeParse({}).success).toBe(false)
    })

    it("should reject response with null floatingips", () => {
      expect(FloatingIpListResponseSchema.safeParse({ floatingips: null }).success).toBe(false)
    })

    it("should reject response with invalid floating IP in array", () => {
      const result = FloatingIpListResponseSchema.safeParse({
        floatingips: [{ id: "fip-1" }], // Missing required fields
      })
      expect(result.success).toBe(false)
    })
  })

  describe("FloatingIpResponseSchema", () => {
    it("should validate single floating IP response", () => {
      expect(FloatingIpResponseSchema.safeParse({ floatingip: minimalValidFloatingIp }).success).toBe(true)
    })

    it("should reject response without floatingip key", () => {
      expect(FloatingIpResponseSchema.safeParse({}).success).toBe(false)
    })

    it("should reject response with invalid floatingip payload", () => {
      const result = FloatingIpResponseSchema.safeParse({ floatingip: { id: "fip-1" } })
      expect(result.success).toBe(false)
    })
  })

  describe("FloatingIpUpdateRequestSchema", () => {
    it("should validate simple association request", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(true)
    })

    it("should validate disassociate request with null port_id", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: null,
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(true)
    })

    it("should validate disassociation from port using floating IP id", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: null,
      }

      const result = FloatingIpUpdateRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.floatingip_id).toBe("fip-123")
        expect(result.data.port_id).toBeNull()
      }
    })

    it("should validate request with optional fields", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
        fixed_ip_address: "10.0.0.5",
        description: "Updated floating IP",
        distributed: true,
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(true)
    })

    it("should reject request without floatingip_id", () => {
      const request = {
        project_id: "test-project",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(false)
    })

    it("should reject request without port_id", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        description: "Updated floating IP",
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(false)
    })

    it("should validate optional fixed_ip_address field", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
        fixed_ip_address: "10.0.0.5",
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(true)
    })

    it("should validate optional description field", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
        description: "Updated floating IP",
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(true)
    })

    it("should validate optional distributed field", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
        distributed: true,
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(true)
    })

    it("should reject invalid distributed type", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
        distributed: "true",
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(false)
    })

    it("should reject invalid fixed_ip_address type", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
        fixed_ip_address: 123,
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(false)
    })

    it("should reject invalid description type", () => {
      const request = {
        project_id: "test-project",
        floatingip_id: "fip-123",
        port_id: "fc861431-0e6c-4842-a0ed-e2363f9bc3a8",
        description: 123,
      }

      expect(FloatingIpUpdateRequestSchema.safeParse(request).success).toBe(false)
    })
  })

  describe("FloatingIpIdInputSchema", () => {
    it("should validate request with floatingip_id", () => {
      expect(FloatingIpIdInputSchema.safeParse({ project_id: "test-project", floatingip_id: "fip-123" }).success).toBe(
        true
      )
    })

    it("should reject request without floatingip_id", () => {
      expect(FloatingIpIdInputSchema.safeParse({ project_id: "test-project" }).success).toBe(false)
    })
  })

  describe("FloatingIpCreateRequestSchema", () => {
    it("should validate minimal create request", () => {
      const request = {
        project_id: "test-project",
        tenant_id: "tenant-1",
        floating_network_id: "376da547-b977-4cfe-9cba-275c80debf57",
      }

      expect(FloatingIpCreateRequestSchema.safeParse(request).success).toBe(true)
    })

    it("should validate complete create request", () => {
      const request = {
        project_id: "test-project",
        tenant_id: "tenant-1",
        floating_network_id: "376da547-b977-4cfe-9cba-275c80debf57",
        port_id: "ce705c24-c1ef-408a-bda3-7bbd946164ab",
        subnet_id: "278d9507-36e7-403c-bb80-1d7093318fe6",
        fixed_ip_address: "10.0.0.3",
        floating_ip_address: "172.24.4.228",
        description: "floating ip for testing",
        dns_domain: "my-domain.org.",
        dns_name: "myfip",
        qos_policy_id: "29d5e02e-d5ab-4929-bee4-4a9fc12e22ae",
        distributed: true,
      }

      expect(FloatingIpCreateRequestSchema.safeParse(request).success).toBe(true)
    })

    it("should reject request without floating_network_id", () => {
      const request = {
        project_id: "test-project",
        tenant_id: "tenant-1",
      }

      expect(FloatingIpCreateRequestSchema.safeParse(request).success).toBe(false)
    })

    it("should reject request without tenant_id", () => {
      const request = {
        project_id: "project-1",
        floating_network_id: "376da547-b977-4cfe-9cba-275c80debf57",
      }

      expect(FloatingIpCreateRequestSchema.safeParse(request).success).toBe(false)
    })

    it("should reject request without project_id", () => {
      const request = {
        tenant_id: "tenant-1",
        floating_network_id: "376da547-b977-4cfe-9cba-275c80debf57",
      }

      expect(FloatingIpCreateRequestSchema.safeParse(request).success).toBe(false)
    })
  })

  describe("FloatingIpQueryParametersSchema", () => {
    it("should validate empty query parameters (all optional)", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project" }).success).toBe(true)
    })

    it("should validate query with single filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", id: "fip-123" }).success).toBe(
        true
      )
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", floating_ip_address: "203.0.113.10" })
          .success
      ).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", status: "ACTIVE" }).success).toBe(
        true
      )
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", searchTerm: "web" }).success).toBe(
        true
      )
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
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", router_id: null }).success).toBe(
        true
      )
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", router_id: "router-1" }).success
      ).toBe(true)
    })

    it("should validate nullable port_id filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", port_id: null }).success).toBe(
        true
      )
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", port_id: "port-123" }).success
      ).toBe(true)
    })

    it("should validate sort parameters", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", sort_dir: "asc" }).success).toBe(
        true
      )
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", sort_dir: "desc" }).success).toBe(
        true
      )
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
        expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", sort_key: key }).success).toBe(
          true
        )
      })
    })

    it("should reject invalid sort_key", () => {
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", sort_key: "invalid_key" }).success
      ).toBe(false)
    })

    it("should validate tag filters", () => {
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", tags: ["tag1", "tag2"] }).success
      ).toBe(true)
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", "tags-any": "tag1,tag2" }).success
      ).toBe(true)
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", "not-tags": "tag1,tag2" }).success
      ).toBe(true)
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", "not-tags-any": "tag1,tag2" }).success
      ).toBe(true)
    })

    it("should validate tags as array of strings", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", tags: [] }).success).toBe(true)
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", tags: ["production"] }).success
      ).toBe(true)
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", tags: ["prod", "web", "critical"] })
          .success
      ).toBe(true)
    })

    it("should reject tags as non-array type", () => {
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", tags: "production" }).success
      ).toBe(false)
    })

    it("should validate nullable description filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", description: null }).success).toBe(
        true
      )
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", description: "Test" }).success
      ).toBe(true)
    })

    it("should validate fields parameter as string", () => {
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", fields: "id,floating_ip_address" })
          .success
      ).toBe(true)
    })

    it("should validate fields parameter as array", () => {
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", fields: ["id", "floating_ip_address"] })
          .success
      ).toBe(true)
    })

    it("should reject fields parameter with invalid type", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", fields: 123 }).success).toBe(false)
    })

    it("should validate pagination parameters", () => {
      const query = {
        project_id: "test-project",
        limit: 50,
        marker: "fip-last",
        page_reverse: false,
      }
      expect(FloatingIpQueryParametersSchema.safeParse(query).success).toBe(true)
    })

    it("should validate page_reverse as boolean", () => {
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", page_reverse: true }).success
      ).toBe(true)
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", page_reverse: false }).success
      ).toBe(true)
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
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", status: "ACTIVE" }).success).toBe(
        true
      )
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", status: "DOWN" }).success).toBe(
        true
      )
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", status: "ERROR" }).success).toBe(
        true
      )
    })

    it("should reject invalid status filter", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", status: "INVALID" }).success).toBe(
        false
      )
    })

    it("should validate revision_number as number", () => {
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", revision_number: 0 }).success
      ).toBe(true)
      expect(
        FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", revision_number: 999 }).success
      ).toBe(true)
    })

    it("should validate limit as number", () => {
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", limit: 1 }).success).toBe(true)
      expect(FloatingIpQueryParametersSchema.safeParse({ project_id: "test-project", limit: 1000 }).success).toBe(true)
    })

    it("should validate real-world filtering scenarios", () => {
      // Find unassociated floating IPs
      expect(
        FloatingIpQueryParametersSchema.safeParse({
          project_id: "test-project",
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
          project_id: "test-project",
          floating_network_id: "net-external-1",
          limit: 50,
        }).success
      ).toBe(true)

      // Find active floating IPs with tags
      expect(
        FloatingIpQueryParametersSchema.safeParse({
          project_id: "test-project",
          status: "ACTIVE" as const,
          tags: ["production"],
        }).success
      ).toBe(true)
    })
  })

  describe("ExternalNetworksQuerySchema", () => {
    it("should apply router:external=true default", () => {
      const result = ExternalNetworksQuerySchema.safeParse({ project_id: "test-project" })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.project_id).toBe("test-project")
        expect(result.data["router:external"]).toBe(true)
      }
    })

    it("should accept explicit router:external=true", () => {
      const result = ExternalNetworksQuerySchema.safeParse({
        project_id: "test-project",
        "router:external": true,
      })

      expect(result.success).toBe(true)
    })

    it("should reject router:external=false", () => {
      const result = ExternalNetworksQuerySchema.safeParse({
        project_id: "test-project",
        "router:external": false,
      })

      expect(result.success).toBe(false)
    })

    it("should reject missing project_id", () => {
      const result = ExternalNetworksQuerySchema.safeParse({})

      expect(result.success).toBe(false)
    })
  })

  describe("ExternalNetworkSchema", () => {
    it("should parse a valid external network", () => {
      const result = ExternalNetworkSchema.safeParse({
        id: "net-1",
        name: "public",
        project_id: "admin-project",
        "router:external": true,
        shared: true,
        status: "ACTIVE",
        updated_at: "2026-05-05T10:00:00Z",
        is_default: true,
      })

      expect(result.success).toBe(true)
    })

    it("should parse with required fields only", () => {
      const result = ExternalNetworkSchema.safeParse({
        id: "net-2",
        name: "public-2",
        project_id: "admin-project",
        shared: false,
        status: "DOWN",
      })

      expect(result.success).toBe(true)
    })

    it("should reject invalid network status", () => {
      const result = ExternalNetworkSchema.safeParse({
        id: "net-3",
        name: "broken",
        project_id: "admin-project",
        shared: true,
        status: "BROKEN",
      })

      expect(result.success).toBe(false)
    })
  })

  describe("ExternalNetworksResponseSchema", () => {
    it("should parse valid external networks response", () => {
      const result = ExternalNetworksResponseSchema.safeParse({
        networks: [
          {
            id: "net-1",
            name: "public",
            project_id: "admin-project",
            "router:external": true,
            shared: true,
            status: "ACTIVE",
          },
        ],
      })

      expect(result.success).toBe(true)
    })

    it("should accept empty networks array", () => {
      const result = ExternalNetworksResponseSchema.safeParse({ networks: [] })

      expect(result.success).toBe(true)
    })

    it("should reject response without networks", () => {
      const result = ExternalNetworksResponseSchema.safeParse({})

      expect(result.success).toBe(false)
    })
  })

  describe("AvailablePortsQuerySchema", () => {
    it("should apply defaults for required project query", () => {
      const result = AvailablePortsQuerySchema.safeParse({ project_id: "test-project" })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.project_id).toBe("test-project")
        expect(result.data.status).toBe("ACTIVE")
        expect(result.data.admin_state_up).toBe(true)
      }
    })

    it("should accept explicit ACTIVE and true values", () => {
      const result = AvailablePortsQuerySchema.safeParse({
        project_id: "test-project",
        status: "ACTIVE",
        admin_state_up: true,
      })

      expect(result.success).toBe(true)
    })

    it("should reject non-ACTIVE status", () => {
      const result = AvailablePortsQuerySchema.safeParse({
        project_id: "test-project",
        status: "DOWN",
      })

      expect(result.success).toBe(false)
    })

    it("should reject admin_state_up false", () => {
      const result = AvailablePortsQuerySchema.safeParse({
        project_id: "test-project",
        admin_state_up: false,
      })

      expect(result.success).toBe(false)
    })

    it("should reject missing project_id", () => {
      const result = AvailablePortsQuerySchema.safeParse({})

      expect(result.success).toBe(false)
    })
  })

  describe("AvailablePortSchema", () => {
    it("should parse a port with all available fields", () => {
      const result = AvailablePortSchema.safeParse({
        id: "port-uuid",
        name: "web-port",
        fixed_ips: [{ ip_address: "10.0.0.5", subnet_id: "subnet-1" }],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe("port-uuid")
        expect(result.data.name).toBe("web-port")
        expect(result.data.fixed_ips).toHaveLength(1)
      }
    })

    it("should parse a port with only id", () => {
      const result = AvailablePortSchema.safeParse({ id: "port-uuid" })

      expect(result.success).toBe(true)
    })

    it("should accept null name", () => {
      const result = AvailablePortSchema.safeParse({ id: "port-uuid", name: null })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBeNull()
      }
    })

    it("should accept empty fixed_ips array", () => {
      const result = AvailablePortSchema.safeParse({ id: "port-uuid", fixed_ips: [] })

      expect(result.success).toBe(true)
    })

    it("should reject a port without id", () => {
      const result = AvailablePortSchema.safeParse({ name: "web-port" })

      expect(result.success).toBe(false)
    })

    it("should allow extra fields from a broader port payload", () => {
      const result = AvailablePortSchema.safeParse({
        id: "port-uuid",
        name: "web-port",
        fixed_ips: [],
        admin_state_up: true,
        network_id: "net-1",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("AvailablePortsResponseSchema", () => {
    it("should parse a valid available ports response", () => {
      const result = AvailablePortsResponseSchema.safeParse({
        ports: [
          { id: "port-1", name: "web-port", fixed_ips: [{ ip_address: "10.0.0.1", subnet_id: "subnet-1" }] },
          { id: "port-2", name: null, fixed_ips: [] },
        ],
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ports).toHaveLength(2)
      }
    })

    it("should accept an empty ports array", () => {
      const result = AvailablePortsResponseSchema.safeParse({ ports: [] })

      expect(result.success).toBe(true)
    })

    it("should reject a response without ports", () => {
      const result = AvailablePortsResponseSchema.safeParse({})

      expect(result.success).toBe(false)
    })
  })
})
