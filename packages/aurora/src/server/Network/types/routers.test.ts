import { describe, it, expect } from "vitest"
import {
  isValidIpAddress,
  isValidCidr,
  RouterSchema,
  RouterListResponseSchema,
  RouterResponseSchema,
  RouterInterfaceInfoSchema,
  RouterPortSchema,
  ExtensionListResponseSchema,
  NetworkSummaryListResponseSchema,
  RouterQueryParametersSchema,
  RouterIdInputSchema,
  RouterCreateRequestSchema,
  RouterUpdateRequestSchema,
  RouterSetGatewayRequestSchema,
  RouterInterfaceRequestSchema,
  ExternalGatewayInfoInputSchema,
} from "./router"

const PROJECT_ID = "proj-1"

describe("OpenStack Router Schema Validation", () => {
  const minimalValidRouter = {
    id: "router-1",
    status: "ACTIVE",
    admin_state_up: true,
    project_id: PROJECT_ID,
  }

  const completeValidRouter = {
    ...minimalValidRouter,
    name: "edge-router",
    description: "Main edge router",
    external_gateway_info: {
      network_id: "ext-net-1",
      enable_snat: true,
      external_fixed_ips: [{ subnet_id: "ext-subnet-1", ip_address: "172.24.4.10" }],
      qos_policy_id: null,
    },
    routes: [{ destination: "10.1.0.0/16", nexthop: "10.0.0.5" }],
    distributed: false,
    ha: false,
    enable_ndp_proxy: null,
    enable_default_route_bfd: false,
    enable_default_route_ecmp: false,
    availability_zone_hints: [],
    availability_zones: ["nova"],
    flavor_id: null,
    tenant_id: PROJECT_ID,
    revision_number: 3,
    tags: ["prod"],
    created_at: "2026-01-10T08:00:00Z",
    updated_at: "2026-01-15T12:00:00Z",
  }

  describe("RouterSchema", () => {
    it("validates a minimal router and applies defaults", () => {
      const result = RouterSchema.safeParse(minimalValidRouter)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("")
        expect(result.data.description).toBe("")
        expect(result.data.routes).toEqual([])
      }
    })

    it("validates a complete router", () => {
      const result = RouterSchema.safeParse(completeValidRouter)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.external_gateway_info?.external_fixed_ips?.[0].ip_address).toBe("172.24.4.10")
        expect(result.data.routes).toHaveLength(1)
      }
    })

    it("accepts null external_gateway_info (no gateway set)", () => {
      const result = RouterSchema.safeParse({ ...minimalValidRouter, external_gateway_info: null })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.external_gateway_info).toBeNull()
      }
    })

    it("accepts a router without extension-specific fields", () => {
      const result = RouterSchema.safeParse(minimalValidRouter)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.distributed).toBeUndefined()
        expect(result.data.ha).toBeUndefined()
      }
    })

    it.each(["id", "status", "admin_state_up", "project_id"])("rejects a router without %s", (field) => {
      const router: Record<string, unknown> = { ...minimalValidRouter }
      delete router[field]

      const result = RouterSchema.safeParse(router)

      expect(result.success).toBe(false)
      if (!result.success) expect(result.error.issues[0].path).toContain(field)
    })

    it("rejects external_gateway_info without network_id", () => {
      const result = RouterSchema.safeParse({ ...minimalValidRouter, external_gateway_info: { enable_snat: true } })
      expect(result.success).toBe(false)
    })
  })

  describe("RouterListResponseSchema / RouterResponseSchema", () => {
    it("validates a list response", () => {
      expect(RouterListResponseSchema.safeParse({ routers: [minimalValidRouter] }).success).toBe(true)
    })

    it("validates an empty routers array", () => {
      expect(RouterListResponseSchema.safeParse({ routers: [] }).success).toBe(true)
    })

    it("rejects a list response without routers key", () => {
      expect(RouterListResponseSchema.safeParse({}).success).toBe(false)
    })

    it("validates a single router response", () => {
      expect(RouterResponseSchema.safeParse({ router: completeValidRouter }).success).toBe(true)
    })

    it("rejects a single router response without router key", () => {
      expect(RouterResponseSchema.safeParse({ routers: [minimalValidRouter] }).success).toBe(false)
    })
  })

  describe("RouterInterfaceInfoSchema", () => {
    it("validates an add/remove interface response (not wrapped in a router key)", () => {
      const result = RouterInterfaceInfoSchema.safeParse({
        id: "router-1",
        subnet_id: "subnet-1",
        subnet_ids: ["subnet-1"],
        port_id: "port-1",
        network_id: "net-1",
        project_id: PROJECT_ID,
        tenant_id: PROJECT_ID,
      })
      expect(result.success).toBe(true)
    })

    it("requires id and port_id", () => {
      expect(RouterInterfaceInfoSchema.safeParse({ subnet_id: "subnet-1" }).success).toBe(false)
    })
  })

  describe("RouterPortSchema", () => {
    const port = {
      id: "port-1",
      network_id: "net-1",
      device_owner: "network:router_interface",
      status: "ACTIVE",
    }

    it("validates a port and applies defaults", () => {
      const result = RouterPortSchema.safeParse(port)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("")
        expect(result.data.fixed_ips).toEqual([])
      }
    })

    it("rejects an unknown port status", () => {
      expect(RouterPortSchema.safeParse({ ...port, status: "UNKNOWN" }).success).toBe(false)
    })
  })

  describe("NetworkSummaryListResponseSchema", () => {
    it("validates networks with and without a name", () => {
      const result = NetworkSummaryListResponseSchema.safeParse({
        networks: [{ id: "ext-net-1", name: "public" }, { id: "ext-net-2", name: null }, { id: "ext-net-3" }],
      })
      expect(result.success).toBe(true)
    })

    it("rejects networks without id", () => {
      expect(NetworkSummaryListResponseSchema.safeParse({ networks: [{ name: "public" }] }).success).toBe(false)
    })
  })

  describe("ExtensionListResponseSchema", () => {
    it("validates an extensions list", () => {
      const result = ExtensionListResponseSchema.safeParse({ extensions: [{ alias: "dvr", name: "DVR" }] })
      expect(result.success).toBe(true)
    })

    it("rejects extensions without alias", () => {
      expect(ExtensionListResponseSchema.safeParse({ extensions: [{ name: "DVR" }] }).success).toBe(false)
    })
  })
})

describe("OpenStack Router Input Schema Validation", () => {
  describe("RouterQueryParametersSchema", () => {
    it("requires a non-empty project_id", () => {
      expect(RouterQueryParametersSchema.safeParse({}).success).toBe(false)
      expect(RouterQueryParametersSchema.safeParse({ project_id: "" }).success).toBe(false)
      expect(RouterQueryParametersSchema.safeParse({ project_id: PROJECT_ID }).success).toBe(true)
    })

    it("validates full list input", () => {
      const result = RouterQueryParametersSchema.safeParse({
        project_id: PROJECT_ID,
        name: "edge",
        description: "main",
        admin_state_up: true,
        sort_key: "name",
        sort_dir: "desc",
        tags: "a,b",
        tags_any: "c",
        not_tags: "d",
        not_tags_any: "e",
        searchTerm: "edge",
        status: "ACTIVE",
        has_gateway: true,
      })
      expect(result.success).toBe(true)
    })

    it("rejects an unsupported sort_key", () => {
      expect(RouterQueryParametersSchema.safeParse({ project_id: PROJECT_ID, sort_key: "created_at" }).success).toBe(
        false
      )
    })

    it("rejects an invalid sort_dir", () => {
      expect(RouterQueryParametersSchema.safeParse({ project_id: PROJECT_ID, sort_dir: "up" }).success).toBe(false)
    })
  })

  describe("RouterIdInputSchema", () => {
    it("validates project_id and router_id", () => {
      expect(RouterIdInputSchema.safeParse({ project_id: PROJECT_ID, router_id: "router-1" }).success).toBe(true)
    })

    it("rejects missing or empty router_id", () => {
      expect(RouterIdInputSchema.safeParse({ project_id: PROJECT_ID }).success).toBe(false)
      expect(RouterIdInputSchema.safeParse({ project_id: PROJECT_ID, router_id: "   " }).success).toBe(false)
    })
  })

  describe("RouterCreateRequestSchema", () => {
    it("accepts a minimal create request", () => {
      expect(RouterCreateRequestSchema.safeParse({ project_id: PROJECT_ID, name: "r1" }).success).toBe(true)
    })

    it("accepts a create request with external gateway", () => {
      const result = RouterCreateRequestSchema.safeParse({
        project_id: PROJECT_ID,
        name: "r1",
        description: "desc",
        admin_state_up: false,
        external_gateway_info: {
          network_id: "ext-net-1",
          enable_snat: false,
          external_fixed_ips: [{ subnet_id: "ext-subnet-1" }, { ip_address: "172.24.4.20" }],
        },
      })
      expect(result.success).toBe(true)
    })

    it("rejects missing, empty or whitespace-only name", () => {
      expect(RouterCreateRequestSchema.safeParse({ project_id: PROJECT_ID }).success).toBe(false)

      const empty = RouterCreateRequestSchema.safeParse({ project_id: PROJECT_ID, name: "" })
      expect(empty.success).toBe(false)
      if (!empty.success) expect(empty.error.issues[0].message).toBe("Name is required")

      expect(RouterCreateRequestSchema.safeParse({ project_id: PROJECT_ID, name: "   " }).success).toBe(false)
    })

    it("trims the name", () => {
      const result = RouterCreateRequestSchema.safeParse({ project_id: PROJECT_ID, name: "  r1  " })
      expect(result.success && result.data.name).toBe("r1")
    })

    it("rejects name and description longer than 255 characters", () => {
      const long = "a".repeat(256)
      expect(RouterCreateRequestSchema.safeParse({ project_id: PROJECT_ID, name: long }).success).toBe(false)
      expect(
        RouterCreateRequestSchema.safeParse({ project_id: PROJECT_ID, name: "r1", description: long }).success
      ).toBe(false)
    })
  })

  describe("ExternalGatewayInfoInputSchema", () => {
    it("requires network_id", () => {
      expect(ExternalGatewayInfoInputSchema.safeParse({ enable_snat: true }).success).toBe(false)
    })

    it("requires subnet_id or ip_address for each external fixed IP", () => {
      expect(ExternalGatewayInfoInputSchema.safeParse({ network_id: "n", external_fixed_ips: [{}] }).success).toBe(
        false
      )
      expect(
        ExternalGatewayInfoInputSchema.safeParse({ network_id: "n", external_fixed_ips: [{ ip_address: "::1" }] })
          .success
      ).toBe(true)
    })

    it("rejects an invalid external fixed IP address", () => {
      expect(
        ExternalGatewayInfoInputSchema.safeParse({ network_id: "n", external_fixed_ips: [{ ip_address: "300.1.1.1" }] })
          .success
      ).toBe(false)
    })
  })

  describe("RouterUpdateRequestSchema", () => {
    const base = { project_id: PROJECT_ID, router_id: "router-1" }

    it("accepts partial updates", () => {
      expect(RouterUpdateRequestSchema.safeParse({ ...base, name: "renamed" }).success).toBe(true)
      expect(RouterUpdateRequestSchema.safeParse({ ...base, admin_state_up: false }).success).toBe(true)
    })

    it("accepts an empty routes array (clears extra routes)", () => {
      expect(RouterUpdateRequestSchema.safeParse({ ...base, routes: [] }).success).toBe(true)
    })

    it("validates extra routes", () => {
      const valid = { destination: "10.1.0.0/16", nexthop: "10.0.0.5" }
      expect(RouterUpdateRequestSchema.safeParse({ ...base, routes: [valid] }).success).toBe(true)
      expect(
        RouterUpdateRequestSchema.safeParse({ ...base, routes: [{ ...valid, destination: "10.1.0.0" }] }).success
      ).toBe(false)
      expect(RouterUpdateRequestSchema.safeParse({ ...base, routes: [{ ...valid, nexthop: "nope" }] }).success).toBe(
        false
      )
    })

    it("requires router_id", () => {
      expect(RouterUpdateRequestSchema.safeParse({ project_id: PROJECT_ID, name: "r1" }).success).toBe(false)
    })
  })

  describe("RouterSetGatewayRequestSchema", () => {
    it("requires external_gateway_info with network_id", () => {
      const base = { project_id: PROJECT_ID, router_id: "router-1" }
      expect(RouterSetGatewayRequestSchema.safeParse(base).success).toBe(false)
      expect(
        RouterSetGatewayRequestSchema.safeParse({ ...base, external_gateway_info: { network_id: "ext-net-1" } }).success
      ).toBe(true)
    })
  })

  describe("RouterInterfaceRequestSchema", () => {
    const base = { project_id: PROJECT_ID, router_id: "router-1" }

    it("accepts exactly one of subnet_id or port_id", () => {
      expect(RouterInterfaceRequestSchema.safeParse({ ...base, subnet_id: "subnet-1" }).success).toBe(true)
      expect(RouterInterfaceRequestSchema.safeParse({ ...base, port_id: "port-1" }).success).toBe(true)
    })

    it("rejects neither or both", () => {
      expect(RouterInterfaceRequestSchema.safeParse(base).success).toBe(false)

      const both = RouterInterfaceRequestSchema.safeParse({ ...base, subnet_id: "subnet-1", port_id: "port-1" })
      expect(both.success).toBe(false)
      if (!both.success) expect(both.error.issues[0].message).toBe("Provide exactly one of subnet_id or port_id")
    })
  })
})

describe("IP and CIDR validators", () => {
  it.each([
    ["10.0.0.1", true],
    ["2001:db8::1", true],
    ["::1", true],
    ["300.1.1.1", false],
    ["10.0.0", false],
    ["", false],
  ])("isValidIpAddress(%j) === %s", (value, expected) => {
    expect(isValidIpAddress(value)).toBe(expected)
  })

  it.each([
    ["10.0.0.0/24", true],
    ["0.0.0.0/0", true],
    ["2001:db8::/32", true],
    ["10.0.0.0/33", false],
    ["2001:db8::/129", false],
    ["10.0.0.0", false],
    ["10.0.0.0/24/1", false],
    ["10.0.0.0/abc", false],
    ["foo/24", false],
  ])("isValidCidr(%j) === %s", (value, expected) => {
    expect(isValidCidr(value)).toBe(expected)
  })
})
