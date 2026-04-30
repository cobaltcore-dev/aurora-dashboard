import { describe, it, expect } from "vitest"
import {
  ListAvailablePortsQuerySchema,
  PortListResponseSchema,
  PortSchema,
  AvailablePortSchema,
  AvailablePortListResponseSchema,
} from "./port"

describe("Port Schemas", () => {
  describe("ListAvailablePortsQuerySchema", () => {
    const TEST_PROJECT_ID = "test-project"

    it("should parse valid query with defaults", () => {
      const input = { project_id: TEST_PROJECT_ID }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.status).toBe("ACTIVE")
        expect(result.data.admin_state_up).toBe(true)
      }
    })

    it("should lock status to ACTIVE even if provided differently", () => {
      const input = { project_id: TEST_PROJECT_ID, status: "DOWN" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should lock admin_state_up to true even if provided as false", () => {
      const input = { project_id: TEST_PROJECT_ID, admin_state_up: false }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should accept valid filter parameters", () => {
      const input = {
        name: "test-port",
        project_id: "uuid-123",
        network_id: "net-456",
        description: "Test port",
      }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should support id as string", () => {
      const input = { project_id: TEST_PROJECT_ID, id: "port-uuid" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe("port-uuid")
      }
    })

    it("should support id as array of strings", () => {
      const input = { project_id: TEST_PROJECT_ID, id: ["port-1", "port-2", "port-3"] }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Array.isArray(result.data.id)).toBe(true)
        expect(result.data.id).toHaveLength(3)
      }
    })

    it("should support sort_key as single value", () => {
      const input = { project_id: TEST_PROJECT_ID, sort_key: "name" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sort_key).toBe("name")
      }
    })

    it("should support sort_key as array", () => {
      const input = { project_id: TEST_PROJECT_ID, sort_key: ["name", "project_id"] }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Array.isArray(result.data.sort_key)).toBe(true)
        expect(result.data.sort_key).toHaveLength(2)
      }
    })

    it("should reject invalid sort_key values", () => {
      const input = { project_id: TEST_PROJECT_ID, sort_key: "invalid_field" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should support sort_dir as single value", () => {
      const input = { project_id: TEST_PROJECT_ID, sort_dir: "asc" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.sort_dir).toBe("asc")
      }
    })

    it("should support sort_dir as array", () => {
      const input = { project_id: TEST_PROJECT_ID, sort_dir: ["asc", "desc"] }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Array.isArray(result.data.sort_dir)).toBe(true)
      }
    })

    it("should support pagination parameters", () => {
      const input = {
        project_id: TEST_PROJECT_ID,
        limit: 50,
        marker: "last-port-id",
        page_reverse: false,
      }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(50)
        expect(result.data.marker).toBe("last-port-id")
        expect(result.data.page_reverse).toBe(false)
      }
    })

    it("should reject negative limit", () => {
      const input = { project_id: TEST_PROJECT_ID, limit: -10 }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject zero limit", () => {
      const input = { project_id: TEST_PROJECT_ID, limit: 0 }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should support tag filters", () => {
      const input = {
        project_id: TEST_PROJECT_ID,
        tags: "production",
        "tags-any": "staging,dev",
        "not-tags": "deprecated",
        "not-tags-any": "temp,test",
      }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should support fields parameter as string", () => {
      const input = { project_id: TEST_PROJECT_ID, fields: "id" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should support fields parameter as array", () => {
      const input = { project_id: TEST_PROJECT_ID, fields: ["id", "name", "status"] }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(Array.isArray(result.data.fields)).toBe(true)
        expect(result.data.fields).toHaveLength(3)
      }
    })

    it("should support fixed_ips filter", () => {
      const input = {
        project_id: TEST_PROJECT_ID,
        fixed_ips: [
          { ip_address: "10.0.0.5", subnet_id: "subnet-123" },
          { ip_address_substr: "10.0", subnet_id: "subnet-456" },
        ],
      }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should support device_id and device_owner filters", () => {
      const input = {
        project_id: TEST_PROJECT_ID,
        device_id: "instance-123",
        device_owner: "compute:nova",
      }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should support mac_address filter", () => {
      const input = { project_id: TEST_PROJECT_ID, mac_address: "fa:16:3e:00:00:01" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should support ip_allocation filter", () => {
      const input = { project_id: TEST_PROJECT_ID, ip_allocation: "immediate" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should reject invalid ip_allocation", () => {
      const input = { project_id: TEST_PROJECT_ID, ip_allocation: "invalid_mode" }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should support mac_learning_enabled filter", () => {
      const input = { project_id: TEST_PROJECT_ID, mac_learning_enabled: true }
      const result = ListAvailablePortsQuerySchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })

  describe("PortSchema", () => {
    const validPort = {
      id: "port-uuid",
      name: "test-port",
      status: "ACTIVE" as const,
      admin_state_up: true,
      device_id: "instance-123",
      device_owner: "compute:nova",
      network_id: "network-uuid",
      project_id: "project-uuid",
      tenant_id: "project-uuid",
      mac_address: "fa:16:3e:00:00:01",
      fixed_ips: [
        {
          ip_address: "10.0.0.5",
          subnet_id: "subnet-uuid",
        },
      ],
      allowed_address_pairs: [],
      extra_dhcp_opts: [],
      security_groups: [],
      port_security_enabled: true,
      "binding:host_id": "compute-node-1",
      "binding:vnic_type": "normal",
      "binding:vif_type": "ovs",
      "binding:vif_details": {
        port_filter: true,
        ovs_hybrid_plug: false,
      },
      "binding:profile": {},
      created_at: "2026-03-10T10:00:00Z",
      updated_at: "2026-03-10T10:00:00Z",
      revision_number: 1,
      description: "Test port",
      ip_allocation: "immediate" as const,
      qos_policy_id: "qos-123",
      qos_network_policy_id: "qos-456",
      data_plane_status: "ACTIVE",
      dns_domain: "example.com",
      dns_name: "port-test",
      dns_assignment: [],
      hints: {
        openvswitch: {
          other_config: {
            "tx-steering": "hash" as const,
          },
        },
      },
      propagate_uplink_status: true,
      port_trusted_vif: false,
    }

    it("should parse valid port object", () => {
      const result = PortSchema.safeParse(validPort)

      expect(result.success).toBe(true)
    })

    it("should parse realistic OpenStack list payload variants", () => {
      const openstackLikePort = {
        id: "b8d8cb9d-f337-4f34-b53a-9fa2bcf0f57b",
        admin_state_up: true,
        status: "DOWN",
        project_id: "65a51966d6734c5b80ae62b0b31e5030",
        tenant_id: "65a51966d6734c5b80ae62b0b31e5030",
        network_id: "d8fdb5b2-134a-4f3f-96cd-97080f1c9f43",
        name: "",
        description: "",
        device_id: "",
        device_owner: "",
        mac_address: "fa:16:3e:3b:0d:88",
        fixed_ips: [
          {
            subnet_id: "f1af9f2b-b905-4a8b-a0e1-9d8e3ccf8950",
            ip_address: "10.180.0.14",
          },
        ],
        security_groups: ["d17db3a1-c7ed-4278-9dbf-9b0a64afd2fd"],
        "binding:host_id": "",
        "binding:vif_type": "unbound",
        "binding:vif_details": {},
        "binding:vnic_type": "normal",
        "binding:profile": {},
        resource_request: {
          required: ["CUSTOM_VNIC_TYPE_NORMAL"],
          resources: {
            NET_BW_EGR_KILOBIT_PER_SEC: 1000,
          },
        },
      }

      const result = PortSchema.safeParse(openstackLikePort)

      expect(result.success).toBe(true)
    })

    it("should accept optional fields", () => {
      const minimal = {
        ...validPort,
        resource_request: undefined,
        mac_learning_enabled: undefined,
        numa_affinity_policy: undefined,
      }

      const result = PortSchema.safeParse(minimal)

      expect(result.success).toBe(true)
    })

    it("should validate port status values", () => {
      const validStatuses: Array<"ACTIVE" | "DOWN" | "BUILD" | "ERROR"> = ["ACTIVE", "DOWN", "BUILD", "ERROR"]

      for (const status of validStatuses) {
        const port = { ...validPort, status }
        const result = PortSchema.safeParse(port)

        expect(result.success).toBe(true)
      }
    })

    it("should reject invalid port status", () => {
      const port = { ...validPort, status: "PENDING" }
      const result = PortSchema.safeParse(port)

      expect(result.success).toBe(false)
    })

    it("should validate binding vif_type values", () => {
      const validTypes: Array<
        | "ovs"
        | "bridge"
        | "macvtap"
        | "hw_veb"
        | "hostdev_physical"
        | "vhostuser"
        | "distributed"
        | "other"
        | "unbound"
        | "binding_failed"
      > = [
        "ovs",
        "bridge",
        "macvtap",
        "hw_veb",
        "hostdev_physical",
        "vhostuser",
        "distributed",
        "other",
        "unbound",
        "binding_failed",
      ]

      for (const type of validTypes) {
        const port = { ...validPort, "binding:vif_type": type }
        const result = PortSchema.safeParse(port)

        expect(result.success).toBe(true)
      }
    })

    it("should validate ip_allocation values", () => {
      const validModes: Array<"deferred" | "immediate" | "none"> = ["deferred", "immediate", "none"]

      for (const mode of validModes) {
        const port = { ...validPort, ip_allocation: mode }
        const result = PortSchema.safeParse(port)

        expect(result.success).toBe(true)
      }
    })

    it("should validate numa_affinity_policy values", () => {
      const validPolicies: Array<"None" | "required" | "preferred" | "legacy"> = [
        "None",
        "required",
        "preferred",
        "legacy",
      ]

      for (const policy of validPolicies) {
        const port = {
          ...validPort,
          numa_affinity_policy: policy,
        }
        const result = PortSchema.safeParse(port)

        expect(result.success).toBe(true)
      }
    })

    it("should support tags array", () => {
      const port = {
        ...validPort,
        tags: ["production", "critical"],
      }
      const result = PortSchema.safeParse(port)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toHaveLength(2)
      }
    })

    it("should accept empty allowed_address_pairs", () => {
      const port = {
        ...validPort,
        allowed_address_pairs: [],
      }
      const result = PortSchema.safeParse(port)

      expect(result.success).toBe(true)
    })

    it("should validate allowed_address_pairs structure", () => {
      const port = {
        ...validPort,
        allowed_address_pairs: [
          {
            ip_address: "192.168.1.0/24",
            mac_address: "fa:16:3e:00:00:02",
          },
          {
            ip_address: "10.0.0.0/8",
          },
        ],
      }
      const result = PortSchema.safeParse(port)

      expect(result.success).toBe(true)
    })

    it("should reject allowed_address_pairs without ip_address", () => {
      const port = {
        ...validPort,
        allowed_address_pairs: [
          {
            mac_address: "fa:16:3e:00:00:02",
          },
        ],
      }
      const result = PortSchema.safeParse(port)

      expect(result.success).toBe(false)
    })

    it("should validate extra_dhcp_opts structure", () => {
      const port = {
        ...validPort,
        extra_dhcp_opts: [
          {
            opt_name: "tftp-server",
            opt_value: "192.168.1.1",
            ip_version: 4,
          },
        ],
      }
      const result = PortSchema.safeParse(port)

      expect(result.success).toBe(true)
    })

    it("should validate dns_assignment structure", () => {
      const port = {
        ...validPort,
        dns_assignment: [
          {
            hostname: "test-port",
            ip_address: "10.0.0.5",
            fqdn: "test-port.example.com",
          },
        ],
      }
      const result = PortSchema.safeParse(port)

      expect(result.success).toBe(true)
    })

    it("should accept resource_request when provided", () => {
      const port = {
        ...validPort,
        resource_request: {
          request_groups: [
            {
              id: "550e8400-e29b-41d4-a716-446655440000",
              required: ["CUSTOM_VNIC_TYPE_NORMAL"],
              resources: {
                NET_BW_EGR_KILOBIT_PER_SEC: 1000,
              },
            },
          ],
          same_subtree: ["550e8400-e29b-41d4-a716-446655440000"],
        },
      }
      const result = PortSchema.safeParse(port)

      expect(result.success).toBe(true)
    })
  })

  describe("PortListResponseSchema", () => {
    it("should parse valid ports list response", () => {
      const response = {
        ports: [
          {
            id: "port-1",
            name: "port-1",
            status: "ACTIVE" as const,
            admin_state_up: true,
            device_id: "instance-1",
            device_owner: "compute:nova",
            network_id: "net-1",
            project_id: "proj-1",
            tenant_id: "proj-1",
            mac_address: "fa:16:3e:00:00:01",
            fixed_ips: [{ ip_address: "10.0.0.1", subnet_id: "subnet-1" }],
            allowed_address_pairs: [],
            extra_dhcp_opts: [],
            security_groups: [],
            port_security_enabled: true,
            "binding:host_id": "node-1",
            "binding:vnic_type": "normal",
            "binding:vif_type": "ovs",
            "binding:vif_details": { port_filter: true, ovs_hybrid_plug: false },
            "binding:profile": {},
            created_at: "2026-03-10T10:00:00Z",
            updated_at: "2026-03-10T10:00:00Z",
            revision_number: 1,
            description: "Port 1",
            ip_allocation: "immediate" as const,
            qos_policy_id: "qos-1",
            qos_network_policy_id: "qos-2",
            data_plane_status: "ACTIVE",
            dns_domain: "example.com",
            dns_name: "port-1",
            dns_assignment: [],
            hints: {
              openvswitch: {
                other_config: { "tx-steering": "hash" as const },
              },
            },
            propagate_uplink_status: true,
            port_trusted_vif: false,
          },
        ],
      }

      const result = PortListResponseSchema.safeParse(response)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ports).toHaveLength(1)
      }
    })

    it("should accept empty ports array", () => {
      const response = { ports: [] }
      const result = PortListResponseSchema.safeParse(response)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ports).toHaveLength(0)
      }
    })

    it("should reject missing ports key", () => {
      const response = {}
      const result = PortListResponseSchema.safeParse(response)

      expect(result.success).toBe(false)
    })

    it("should reject non-array ports", () => {
      const response = { ports: "not-an-array" }
      const result = PortListResponseSchema.safeParse(response)

      expect(result.success).toBe(false)
    })
  })

  describe("AvailablePortSchema", () => {
    it("should parse a port with all 3 fields", () => {
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

    it("should parse a port with only id (name and fixed_ips optional)", () => {
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

    it("should accept port with empty fixed_ips array", () => {
      const result = AvailablePortSchema.safeParse({ id: "port-uuid", fixed_ips: [] })

      expect(result.success).toBe(true)
    })

    it("should reject a port missing id", () => {
      const result = AvailablePortSchema.safeParse({ name: "web-port" })

      expect(result.success).toBe(false)
    })

    it("should not fail on extra fields from full port response (strip mode)", () => {
      const result = AvailablePortSchema.safeParse({
        id: "port-uuid",
        name: "web-port",
        fixed_ips: [],
        admin_state_up: true,
        status: "ACTIVE",
        network_id: "net-1",
      })

      expect(result.success).toBe(true)
    })
  })

  describe("AvailablePortListResponseSchema", () => {
    it("should parse a valid available ports list response", () => {
      const response = {
        ports: [
          { id: "port-1", name: "web-port", fixed_ips: [{ ip_address: "10.0.0.1", subnet_id: "subnet-1" }] },
          { id: "port-2", name: null, fixed_ips: [] },
        ],
      }
      const result = AvailablePortListResponseSchema.safeParse(response)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.ports).toHaveLength(2)
      }
    })

    it("should accept empty ports array", () => {
      const result = AvailablePortListResponseSchema.safeParse({ ports: [] })

      expect(result.success).toBe(true)
    })

    it("should reject missing ports key", () => {
      const result = AvailablePortListResponseSchema.safeParse({})

      expect(result.success).toBe(false)
    })
  })
})
