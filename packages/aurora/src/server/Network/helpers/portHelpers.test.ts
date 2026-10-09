import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import {
  PortErrorHandlers,
  buildPortBody,
  getIpVersion,
  collectPortLookupIds,
  applyPortNames,
  applySecurityGroupNames,
  filterPortsBySearchTerm,
} from "./portHelpers"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"
import { PortSchema, type Port, type PortListItem } from "../types/port"

const makePort = (overrides: Record<string, unknown> = {}): Port =>
  PortSchema.parse({
    id: "port-1",
    network_id: "net-1",
    mac_address: "fa:16:3e:50:a2:79",
    admin_state_up: true,
    status: "DOWN",
    project_id: "proj-1",
    fixed_ips: [
      { subnet_id: "subnet-v4", ip_address: "10.180.242.42" },
      { subnet_id: "subnet-v6", ip_address: "fd00:1234:feed:cafe::328" },
    ],
    security_groups: ["sg-default"],
    ...overrides,
  })

describe("PortErrorHandlers", () => {
  describe("shared defaults", () => {
    it("maps 403 on list to FORBIDDEN with the resource name", () => {
      const error = PortErrorHandlers.list({ status: 403, statusText: "Forbidden" })
      expect(error).toBeInstanceOf(TRPCError)
      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[403])
      expect(error.message).toBe("Access forbidden to Port: Forbidden")
    })

    it("maps 400 on create to BAD_REQUEST with Neutron's message", () => {
      const error = PortErrorHandlers.create({ status: 400, statusText: "Invalid input for fixed_ips" })
      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[400])
      expect(error.message).toBe("Invalid request data for Port: Invalid input for fixed_ips")
    })

    it("maps 412 on update to PRECONDITION_FAILED", () => {
      const error = PortErrorHandlers.update({ status: 412, statusText: "Revision mismatch" }, "port-1")
      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[412])
      expect(error.message).toContain("port-1")
    })

    it("maps unknown statuses to the default error", () => {
      const error = PortErrorHandlers.delete({ status: 503, statusText: "Unavailable" }, "port-1")
      expect(error.code).toBe(DEFAULT_ERROR_NAME)
      expect(error.message).toBe("Failed to process port-1: Unavailable")
    })
  })

  describe("404 overrides", () => {
    it.each([
      ["get", "Port port-1 was not found."],
      ["delete", "Port port-1 was not found."],
      ["update", "Port port-1 or a referenced subnet or security group was not found."],
    ] as const)("%s", (operation, message) => {
      const error = PortErrorHandlers[operation]({ status: 404 }, "port-1")
      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[404])
      expect(error.message).toBe(message)
    })

    it("create", () => {
      const error = PortErrorHandlers.create({ status: 404 })
      expect(error.message).toBe("The selected network, subnet or security group was not found.")
    })
  })

  describe("409 overrides", () => {
    it("create explains IP/MAC conflicts", () => {
      const error = PortErrorHandlers.create({ status: 409, statusText: "IP address 10.0.0.5 already allocated" })
      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[409])
      expect(error.message).toMatch(/already in use/)
    })

    it("update explains IP/MAC conflicts", () => {
      expect(PortErrorHandlers.update({ status: 409 }, "port-1").message).toMatch(/already in use/)
    })

    it("delete explains that the port is still in use", () => {
      const error = PortErrorHandlers.delete(
        { status: 409, statusText: "Port port-1 cannot be deleted directly via the port API" },
        "port-1"
      )
      expect(error.message).toMatch(/still in use/)
    })

    it.each(["create", "update", "delete"] as const)("%s detects quota errors", (operation) => {
      const error = PortErrorHandlers[operation]({ status: 409, statusText: "Quota exceeded for resources: ['port']." })
      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[409])
      expect(error.message).toBe(
        "Port quota exceeded. Delete unused resources or contact an administrator to increase the quota."
      )
    })
  })
})

describe("buildPortBody", () => {
  it("only includes provided fields", () => {
    expect(buildPortBody({ name: "a", description: undefined })).toEqual({ name: "a" })
  })

  it("returns an empty object when nothing is provided", () => {
    expect(buildPortBody({})).toEqual({})
  })

  it("keeps falsy values and null", () => {
    expect(buildPortBody({ name: "", admin_state_up: false, qos_policy_id: null, security_groups: [] })).toEqual({
      name: "",
      admin_state_up: false,
      qos_policy_id: null,
      security_groups: [],
    })
  })

  it("drops undefined keys in fixed IPs and allowed address pairs", () => {
    expect(
      buildPortBody({
        network_id: "net-1",
        fixed_ips: [{ subnet_id: "subnet-1", ip_address: undefined }, { ip_address: "10.0.0.5" }],
        allowed_address_pairs: [{ ip_address: "10.0.0.0/24", mac_address: undefined }],
      })
    ).toEqual({
      network_id: "net-1",
      fixed_ips: [{ subnet_id: "subnet-1" }, { ip_address: "10.0.0.5" }],
      allowed_address_pairs: [{ ip_address: "10.0.0.0/24" }],
    })
  })

  it("keeps an empty fixed_ips list (port without IP)", () => {
    expect(buildPortBody({ fixed_ips: [] })).toEqual({ fixed_ips: [] })
  })
})

describe("getIpVersion", () => {
  it.each([
    ["10.180.242.42", 4],
    ["fd00:1234:feed:cafe::328", 6],
    ["not-an-ip", undefined],
  ])("%s → %s", (ip, version) => {
    expect(getIpVersion(ip)).toBe(version)
  })
})

describe("collectPortLookupIds", () => {
  it("returns unique network and subnet IDs", () => {
    const ports = [
      makePort(),
      makePort({ id: "port-2" }),
      makePort({ id: "port-3", network_id: "net-2", fixed_ips: [] }),
    ]
    expect(collectPortLookupIds(ports)).toEqual({
      networkIds: ["net-1", "net-2"],
      subnetIds: ["subnet-v4", "subnet-v6"],
    })
  })

  it("returns empty lists for no ports", () => {
    expect(collectPortLookupIds([])).toEqual({ networkIds: [], subnetIds: [] })
  })
})

describe("applyPortNames", () => {
  it("adds the network name and the IP version and subnet name of each fixed IP", () => {
    const [port] = applyPortNames(
      [makePort()],
      [{ id: "net-1", name: "dualstack-test" }],
      [
        { id: "subnet-v4", name: "dualstack-v4" },
        { id: "subnet-v6", name: "dualstack-v6" },
      ]
    )

    expect(port.network_name).toBe("dualstack-test")
    expect(port.fixed_ips).toEqual([
      { subnet_id: "subnet-v4", ip_address: "10.180.242.42", ip_version: 4, subnet_name: "dualstack-v4" },
      { subnet_id: "subnet-v6", ip_address: "fd00:1234:feed:cafe::328", ip_version: 6, subnet_name: "dualstack-v6" },
    ])
  })

  it("leaves names undefined when unknown or empty, but still derives the IP version", () => {
    const [port] = applyPortNames([makePort()], [{ id: "net-1", name: "" }], [])

    expect(port.network_name).toBeUndefined()
    expect(port.fixed_ips.map((fixedIp) => fixedIp.subnet_name)).toEqual([undefined, undefined])
    expect(port.fixed_ips.map((fixedIp) => fixedIp.ip_version)).toEqual([4, 6])
  })

  it("defaults to no lookups", () => {
    const [port] = applyPortNames([makePort()])
    expect(port.network_name).toBeUndefined()
  })
})

describe("applySecurityGroupNames", () => {
  it("resolves security group IDs to references with names", () => {
    const [port] = applyPortNames([makePort({ security_groups: ["sg-default", "sg-unknown"] })])
    const details = applySecurityGroupNames(port, [{ id: "sg-default", name: "default" }])

    expect(details.security_groups).toEqual([
      { id: "sg-default", name: "default" },
      { id: "sg-unknown", name: undefined },
    ])
  })

  it("keeps an empty list", () => {
    const [port] = applyPortNames([makePort({ security_groups: [] })])
    expect(applySecurityGroupNames(port).security_groups).toEqual([])
  })
})

describe("filterPortsBySearchTerm", () => {
  const ports: PortListItem[] = applyPortNames(
    [
      makePort({ name: "db-port", description: "Reserved for DB", device_owner: "compute:qa-de-1b" }),
      makePort({
        id: "port-2",
        network_id: "net-2",
        mac_address: "fa:16:3e:aa:bb:cc",
        device_id: "router-1",
        device_owner: "network:router_interface",
        fixed_ips: [{ subnet_id: "subnet-x", ip_address: "192.168.0.1" }],
      }),
    ],
    [
      { id: "net-1", name: "dualstack-test" },
      { id: "net-2", name: "cc-demo_private" },
    ],
    [{ id: "subnet-x", name: "cc-demo_private_sub2" }]
  )

  const search = (term?: string) => filterPortsBySearchTerm(ports, term).map((port) => port.id)

  it("returns all ports without a search term", () => {
    expect(search(undefined)).toEqual(["port-1", "port-2"])
    expect(search("   ")).toEqual(["port-1", "port-2"])
  })

  it.each([
    ["port-2", ["port-2"]],
    ["DB-PORT", ["port-1"]],
    ["reserved", ["port-1"]],
    ["dualstack", ["port-1"]],
    ["net-2", ["port-2"]],
    ["10.180", ["port-1"]],
    ["feed:cafe", ["port-1"]],
    ["subnet-v6", ["port-1"]],
    ["private_sub2", ["port-2"]],
    ["aa:bb", ["port-2"]],
    ["router-1", ["port-2"]],
    ["compute:", ["port-1"]],
    ["nothing-matches", []],
  ])("matches %s", (term, expected) => {
    expect(search(term)).toEqual(expected)
  })
})
