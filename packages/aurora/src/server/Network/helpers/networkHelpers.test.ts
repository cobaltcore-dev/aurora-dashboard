import { describe, it, expect } from "vitest"
import { TRPCError } from "@trpc/server"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"
import {
  NetworkErrorHandlers,
  buildNetworkBody,
  getNetworkListScopes,
  mergeNetworks,
  sortNetworks,
  collectSubnetIds,
  applySubnetNames,
} from "./networkHelpers"
import type { Network } from "../types/network"

const createNetwork = (overrides: Partial<Network> = {}): Network => ({
  id: "net-1",
  name: "private",
  description: "",
  status: "ACTIVE",
  admin_state_up: true,
  shared: false,
  subnets: [],
  project_id: "proj-1",
  ...overrides,
})

describe("NetworkErrorHandlers", () => {
  describe("shared defaults", () => {
    it("maps 401 on list", () => {
      const error = NetworkErrorHandlers.list({ status: 401, statusText: "Unauthorized" })

      expect(error).toBeInstanceOf(TRPCError)
      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[401])
      expect(error.message).toBe("Unauthorized access to Network: Unauthorized")
    })

    it("maps 403 on list", () => {
      const error = NetworkErrorHandlers.list({ status: 403, statusText: "Forbidden" })

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[403])
      expect(error.message).toBe("Access forbidden to Network: Forbidden")
    })

    it("maps unknown statuses to the default error", () => {
      const error = NetworkErrorHandlers.list({ status: 503, statusText: "Service Unavailable" })

      expect(error.code).toBe(DEFAULT_ERROR_NAME)
      expect(error.message).toBe("Failed to process Network: Service Unavailable")
    })

    it("uses the network ID as the label", () => {
      const error = NetworkErrorHandlers.setTags({ status: 400, statusText: "Invalid tag" }, "net-1")

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[400])
      expect(error.message).toBe("Invalid request data for net-1: Invalid tag")
    })

    it("keeps the default 412 on update", () => {
      const error = NetworkErrorHandlers.update({ status: 412, statusText: "Revision mismatch" }, "net-1")

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[412])
    })
  })

  describe("404 overrides", () => {
    it.each(["get", "update", "delete", "setTags"] as const)("maps 404 on %s", (operation) => {
      const error = NetworkErrorHandlers[operation]({ status: 404, statusText: "Not Found" }, "net-1")

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[404])
      expect(error.message).toBe("Network net-1 was not found.")
    })
  })

  describe("403 overrides", () => {
    it.each(["create", "update"] as const)("explains admin-only settings on %s", (operation) => {
      const error = NetworkErrorHandlers[operation]({ status: 403, statusText: "Policy doesn't allow it" }, "net-1")

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[403])
      expect(error.message).toMatch(/require admin rights/)
      expect(error.message).toMatch(/\(Policy doesn't allow it\)$/)
    })

    it("omits empty Neutron messages", () => {
      const error = NetworkErrorHandlers.create({ status: 403 })

      expect(error.message).toMatch(/require admin rights\.$/)
    })
  })

  describe("409 overrides", () => {
    it("explains ports in use on delete", () => {
      const error = NetworkErrorHandlers.delete({ status: 409, statusText: "Unable to complete operation" }, "net-1")

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[409])
      expect(error.message).toMatch(/still has ports in use/)
    })

    it("explains sharing conflicts on update", () => {
      const error = NetworkErrorHandlers.update({ status: 409, statusText: "Multiple tenants are using it" }, "net-1")

      expect(error.message).toMatch(/Sharing can't be disabled/)
    })

    it.each(["create", "update", "delete"] as const)("detects quota errors on %s", (operation) => {
      const error = NetworkErrorHandlers[operation]({
        status: 409,
        statusText: "Quota exceeded for resources: ['network'].",
      })

      expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[409])
      expect(error.message).toMatch(/^Network quota exceeded/)
    })

    it("falls back to the operation message on create", () => {
      expect(NetworkErrorHandlers.create({ status: 409 }).message).toBe(
        "The network can't be created with these settings."
      )
    })
  })
})

describe("buildNetworkBody", () => {
  it("keeps provided fields, including false and empty values", () => {
    expect(
      buildNetworkBody({ name: "", admin_state_up: false, mtu: undefined, shared: false, "router:external": true })
    ).toEqual({ name: "", admin_state_up: false, shared: false, "router:external": true })
  })

  it("returns an empty object when nothing is provided", () => {
    expect(buildNetworkBody({ name: undefined })).toEqual({})
  })
})

describe("getNetworkListScopes", () => {
  it.each([
    [undefined, ["own", "shared"]],
    [true, ["shared"]],
    [false, ["own"]],
  ])("shared=%s requests %j", (shared, scopes) => {
    expect(getNetworkListScopes(shared)).toEqual(scopes)
  })
})

describe("mergeNetworks", () => {
  it("deduplicates by ID, keeping the first occurrence and order", () => {
    const own = [createNetwork({ id: "a" }), createNetwork({ id: "b", shared: true, name: "own-shared" })]
    const shared = [createNetwork({ id: "b", shared: true, name: "duplicate" }), createNetwork({ id: "c" })]

    const result = mergeNetworks(own, shared)

    expect(result.map((network) => network.id)).toEqual(["a", "b", "c"])
    expect(result[1].name).toBe("own-shared")
  })

  it("returns [] without lists", () => {
    expect(mergeNetworks()).toEqual([])
  })
})

describe("sortNetworks", () => {
  const networks = [
    createNetwork({ id: "b", name: "beta", mtu: 1500, admin_state_up: true }),
    createNetwork({ id: "a", name: "alpha", mtu: null, admin_state_up: false }),
    createNetwork({ id: "c", name: "gamma", mtu: 8950, admin_state_up: true }),
  ]

  it("keeps the order without a sort key", () => {
    expect(sortNetworks(networks, undefined)).toBe(networks)
  })

  it("sorts strings ascending by default", () => {
    expect(sortNetworks(networks, "name").map((network) => network.id)).toEqual(["a", "b", "c"])
  })

  it("sorts descending", () => {
    expect(sortNetworks(networks, "name", "desc").map((network) => network.id)).toEqual(["c", "b", "a"])
  })

  it("sorts numbers numerically and missing values last", () => {
    expect(sortNetworks(networks, "mtu").map((network) => network.id)).toEqual(["b", "c", "a"])
  })

  it("sorts booleans", () => {
    expect(sortNetworks(networks, "admin_state_up").map((network) => network.id)).toEqual(["a", "b", "c"])
  })

  it("does not mutate the input", () => {
    sortNetworks(networks, "name")
    expect(networks.map((network) => network.id)).toEqual(["b", "a", "c"])
  })
})

describe("collectSubnetIds", () => {
  it("returns unique subnet IDs", () => {
    expect(
      collectSubnetIds([
        createNetwork({ subnets: ["s1", "s2"] }),
        createNetwork({ id: "net-2", subnets: ["s2", "s3"] }),
      ])
    ).toEqual(["s1", "s2", "s3"])
  })

  it("returns [] for networks without subnets", () => {
    expect(collectSubnetIds([createNetwork()])).toEqual([])
  })
})

describe("applySubnetNames", () => {
  it("adds subnet names in subnet order", () => {
    const [result] = applySubnetNames(
      [createNetwork({ subnets: ["s2", "s1"] })],
      [
        { id: "s1", name: "first" },
        { id: "s2", name: "second" },
      ]
    )

    expect(result.subnet_details).toEqual([
      { id: "s2", name: "second" },
      { id: "s1", name: "first" },
    ])
  })

  it("leaves unknown and empty names undefined", () => {
    const [result] = applySubnetNames([createNetwork({ subnets: ["s1", "s2"] })], [{ id: "s1", name: "" }])

    expect(result.subnet_details).toEqual([
      { id: "s1", name: undefined },
      { id: "s2", name: undefined },
    ])
  })

  it("returns [] subnet details for networks without subnets", () => {
    expect(applySubnetNames([createNetwork()])[0].subnet_details).toEqual([])
  })
})
