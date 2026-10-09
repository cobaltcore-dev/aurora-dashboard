import { describe, it, expect } from "vitest"
import {
  isValidIpAddressOrCidr,
  isValidMacAddress,
  PortSchema,
  PortListResponseSchema,
  PortResponseSchema,
  PortQueryParametersSchema,
  PortIdInputSchema,
  PortFixedIpInputSchema,
  AllowedAddressPairInputSchema,
  PortCreateRequestSchema,
  PortUpdateRequestSchema,
} from "./port"
import { SecurityGroupSummaryListResponseSchema, SubnetSummaryListResponseSchema } from "./index"

const TEST_PROJECT_ID = "proj-1"

const minimalPort = {
  id: "port-1",
  network_id: "net-1",
  mac_address: "fa:16:3e:50:a2:79",
  admin_state_up: true,
  status: "DOWN",
  project_id: TEST_PROJECT_ID,
}

const completePort = {
  ...minimalPort,
  name: "reserved-ip",
  description: "Reserved for the DB VM",
  device_id: "server-1",
  device_owner: "compute:qa-de-1b",
  fixed_ips: [
    { subnet_id: "subnet-v4", ip_address: "10.180.242.42" },
    { subnet_id: "subnet-v6", ip_address: "fd00:1234:feed:cafe::328" },
  ],
  security_groups: ["sg-default"],
  allowed_address_pairs: [{ ip_address: "10.0.0.0/24", mac_address: "fa:16:3e:00:00:01" }],
  port_security_enabled: true,
  dns_name: "db",
  qos_policy_id: null,
  "binding:vnic_type": "normal",
  "binding:host_id": "",
  tenant_id: TEST_PROJECT_ID,
  revision_number: 3,
  tags: ["prod"],
  created_at: "2025-02-28T14:36:21Z",
  updated_at: "2025-02-28T14:36:21Z",
}

describe("Port primitives", () => {
  it.each([
    ["10.0.0.5", true],
    ["fd00::1", true],
    ["10.0.0.0/24", true],
    ["fd00::/64", true],
    ["10.0.0.0/33", false],
    ["10.0.0.0/", false],
    ["not-an-ip", false],
    ["", false],
  ])("isValidIpAddressOrCidr(%s) is %s", (value, expected) => {
    expect(isValidIpAddressOrCidr(value)).toBe(expected)
  })

  it.each([
    ["fa:16:3e:50:a2:79", true],
    ["FA-16-3E-50-A2-79", true],
    ["fa:16:3e:50:a2", false],
    ["fa:16:3e:50:a2:7g", false],
    ["", false],
  ])("isValidMacAddress(%s) is %s", (value, expected) => {
    expect(isValidMacAddress(value)).toBe(expected)
  })
})

describe("Port response schemas", () => {
  describe("PortSchema", () => {
    it("validates a minimal port and applies defaults", () => {
      const result = PortSchema.safeParse(minimalPort)
      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        name: "",
        description: "",
        device_id: "",
        device_owner: "",
        fixed_ips: [],
        security_groups: [],
        allowed_address_pairs: [],
      })
    })

    it("validates a complete port", () => {
      const result = PortSchema.safeParse(completePort)
      expect(result.success).toBe(true)
      expect(result.data?.fixed_ips).toHaveLength(2)
      expect(result.data?.["binding:vnic_type"]).toBe("normal")
    })

    it("accepts null for extension fields", () => {
      const result = PortSchema.safeParse({
        ...minimalPort,
        port_security_enabled: null,
        dns_name: null,
        qos_policy_id: null,
        "binding:vnic_type": null,
        "binding:host_id": null,
      })
      expect(result.success).toBe(true)
    })

    it("accepts statuses outside the documented set", () => {
      expect(PortSchema.safeParse({ ...minimalPort, status: "N/A" }).success).toBe(true)
    })

    it.each(["id", "network_id", "mac_address", "admin_state_up", "status", "project_id"])(
      "rejects a port without %s",
      (field) => {
        const port: Record<string, unknown> = { ...minimalPort }
        delete port[field]
        expect(PortSchema.safeParse(port).success).toBe(false)
      }
    )

    it("rejects fixed IPs without subnet_id", () => {
      expect(PortSchema.safeParse({ ...minimalPort, fixed_ips: [{ ip_address: "10.0.0.5" }] }).success).toBe(false)
    })
  })

  it("validates the list envelope", () => {
    expect(PortListResponseSchema.safeParse({ ports: [minimalPort, completePort] }).success).toBe(true)
    expect(PortListResponseSchema.safeParse({ ports: [] }).success).toBe(true)
    expect(PortListResponseSchema.safeParse({}).success).toBe(false)
  })

  it("validates the single envelope", () => {
    expect(PortResponseSchema.safeParse({ port: completePort }).success).toBe(true)
    expect(PortResponseSchema.safeParse({ ports: [completePort] }).success).toBe(false)
  })

  it("validates subnet and security group summaries", () => {
    expect(SubnetSummaryListResponseSchema.safeParse({ subnets: [{ id: "subnet-1" }] }).data?.subnets[0].name).toBe("")
    expect(
      SecurityGroupSummaryListResponseSchema.safeParse({
        security_groups: [{ id: "sg-1", name: "default" }, { id: "sg-2", name: null }, { id: "sg-3" }],
      }).success
    ).toBe(true)
    expect(SecurityGroupSummaryListResponseSchema.safeParse({ security_groups: [{ name: "x" }] }).success).toBe(false)
  })
})

describe("Port input schemas", () => {
  describe("PortQueryParametersSchema", () => {
    it("requires project_id only", () => {
      expect(PortQueryParametersSchema.safeParse({ project_id: TEST_PROJECT_ID }).success).toBe(true)
      expect(PortQueryParametersSchema.safeParse({}).success).toBe(false)
    })

    it("accepts Neutron filters and the BFF search term", () => {
      const result = PortQueryParametersSchema.safeParse({
        project_id: TEST_PROJECT_ID,
        network_id: "net-1",
        status: "ACTIVE",
        device_owner: "compute:qa-de-1b",
        sort_key: "name",
        sort_dir: "asc",
        tags_any: "prod",
        searchTerm: "  10.180  ",
      })
      expect(result.success).toBe(true)
      expect(result.data?.searchTerm).toBe("10.180")
    })

    it("rejects an empty network_id and unsupported sort keys", () => {
      expect(PortQueryParametersSchema.safeParse({ project_id: TEST_PROJECT_ID, network_id: " " }).success).toBe(false)
      expect(PortQueryParametersSchema.safeParse({ project_id: TEST_PROJECT_ID, sort_key: "created_at" }).success).toBe(
        false
      )
    })
  })

  it("PortIdInputSchema requires a non-empty port_id", () => {
    expect(PortIdInputSchema.safeParse({ project_id: TEST_PROJECT_ID, port_id: "port-1" }).success).toBe(true)
    expect(PortIdInputSchema.safeParse({ project_id: TEST_PROJECT_ID, port_id: "" }).success).toBe(false)
    expect(PortIdInputSchema.safeParse({ project_id: TEST_PROJECT_ID }).success).toBe(false)
  })

  describe("PortFixedIpInputSchema", () => {
    it.each([
      [{ subnet_id: "subnet-1" }, true],
      [{ ip_address: "10.0.0.5" }, true],
      [{ subnet_id: "subnet-1", ip_address: "fd00::5" }, true],
      [{}, false],
      [{ subnet_id: "subnet-1", ip_address: "10.0.0.300" }, false],
    ])("%j is valid: %s", (value, expected) => {
      expect(PortFixedIpInputSchema.safeParse(value).success).toBe(expected)
    })
  })

  describe("AllowedAddressPairInputSchema", () => {
    it.each([
      [{ ip_address: "10.0.0.5" }, true],
      [{ ip_address: "10.0.0.0/24", mac_address: "fa:16:3e:00:00:01" }, true],
      [{ ip_address: "10.0.0.0/40" }, false],
      [{ ip_address: "10.0.0.5", mac_address: "not-a-mac" }, false],
      [{}, false],
    ])("%j is valid: %s", (value, expected) => {
      expect(AllowedAddressPairInputSchema.safeParse(value).success).toBe(expected)
    })
  })

  describe("PortCreateRequestSchema", () => {
    it("requires network_id", () => {
      expect(PortCreateRequestSchema.safeParse({ project_id: TEST_PROJECT_ID, network_id: "net-1" }).success).toBe(true)
      expect(PortCreateRequestSchema.safeParse({ project_id: TEST_PROJECT_ID }).success).toBe(false)
    })

    it("accepts all writable fields", () => {
      const result = PortCreateRequestSchema.safeParse({
        project_id: TEST_PROJECT_ID,
        network_id: "net-1",
        name: "reserved-ip",
        description: "Reserved",
        admin_state_up: true,
        mac_address: "fa:16:3e:50:a2:79",
        fixed_ips: [{ subnet_id: "subnet-1", ip_address: "10.0.0.5" }],
        security_groups: ["sg-default"],
        port_security_enabled: true,
        allowed_address_pairs: [{ ip_address: "10.0.0.0/24" }],
        device_id: "server-1",
        device_owner: "compute:nova",
        dns_name: "db",
        qos_policy_id: "qos-1",
      })
      expect(result.success).toBe(true)
    })

    it("accepts an empty fixed_ips list (port without IP)", () => {
      expect(
        PortCreateRequestSchema.safeParse({ project_id: TEST_PROJECT_ID, network_id: "net-1", fixed_ips: [] }).success
      ).toBe(true)
    })

    it.each([
      ["name", { name: "x".repeat(256) }],
      ["description", { description: "x".repeat(256) }],
      ["mac_address", { mac_address: "invalid" }],
      ["security_groups", { security_groups: [""] }],
    ])("rejects an invalid %s", (_field, overrides) => {
      expect(
        PortCreateRequestSchema.safeParse({ project_id: TEST_PROJECT_ID, network_id: "net-1", ...overrides }).success
      ).toBe(false)
    })
  })

  describe("PortUpdateRequestSchema", () => {
    it("requires port_id", () => {
      expect(PortUpdateRequestSchema.safeParse({ project_id: TEST_PROJECT_ID, port_id: "port-1" }).success).toBe(true)
      expect(PortUpdateRequestSchema.safeParse({ project_id: TEST_PROJECT_ID, name: "x" }).success).toBe(false)
    })

    it("accepts null qos_policy_id to remove the policy", () => {
      expect(
        PortUpdateRequestSchema.safeParse({ project_id: TEST_PROJECT_ID, port_id: "port-1", qos_policy_id: null })
          .success
      ).toBe(true)
    })

    it("does not accept network_id or mac_address", () => {
      const result = PortUpdateRequestSchema.safeParse({
        project_id: TEST_PROJECT_ID,
        port_id: "port-1",
        network_id: "net-2",
        mac_address: "fa:16:3e:50:a2:79",
      })
      expect(result.success).toBe(true)
      expect(result.data).not.toHaveProperty("network_id")
      expect(result.data).not.toHaveProperty("mac_address")
    })
  })
})
