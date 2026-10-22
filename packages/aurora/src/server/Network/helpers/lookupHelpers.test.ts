import { describe, it, expect, vi } from "vitest"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import {
  LOOKUP_CHUNK_SIZE,
  fetchNetworkSummaries,
  fetchSubnetSummaries,
  fetchSecurityGroupSummaries,
} from "./lookupHelpers"
import type { getNetworkService } from "./index"

type NetworkService = ReturnType<typeof getNetworkService>

const jsonResponse = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(body),
})

const createNetwork = (get: (url: string) => Promise<unknown>) =>
  ({ get: vi.fn(get) }) as unknown as NetworkService & {
    get: ReturnType<typeof vi.fn>
  }

const splitUrl = (url: string) => {
  const [path, query] = url.split("?")
  return { path, params: new URLSearchParams(query) }
}

describe("fetchNetworkSummaries", () => {
  it("resolves network names with one batched request", async () => {
    const network = createNetwork(async () => jsonResponse({ networks: [{ id: "net-1", name: "private" }] }))

    const result = await fetchNetworkSummaries(network, ["net-1", "net-2"])

    expect(result).toEqual([{ id: "net-1", name: "private" }])
    expect(network.get).toHaveBeenCalledTimes(1)
    const { path, params } = splitUrl(network.get.mock.calls[0][0])
    expect(path).toBe("v2.0/networks")
    expect(params.getAll("id")).toEqual(["net-1", "net-2"])
    expect(params.getAll("fields")).toEqual(["id", "name"])
  })

  it("deduplicates IDs", async () => {
    const network = createNetwork(async () => jsonResponse({ networks: [] }))

    await fetchNetworkSummaries(network, ["net-1", "net-1"])

    expect(splitUrl(network.get.mock.calls[0][0]).params.getAll("id")).toEqual(["net-1"])
  })

  it("makes no request without IDs", async () => {
    const network = createNetwork(async () => jsonResponse({ networks: [] }))

    expect(await fetchNetworkSummaries(network, [])).toEqual([])
    expect(network.get).not.toHaveBeenCalled()
  })

  it(`splits long ID lists into chunks of ${LOOKUP_CHUNK_SIZE}`, async () => {
    const ids = Array.from({ length: LOOKUP_CHUNK_SIZE + 1 }, (_, i) => `net-${i}`)
    const network = createNetwork(async (url) => {
      const chunkIds = splitUrl(url).params.getAll("id")
      return jsonResponse({ networks: chunkIds.map((id) => ({ id, name: id })) })
    })

    const result = await fetchNetworkSummaries(network, ids)

    expect(network.get).toHaveBeenCalledTimes(2)
    expect(network.get.mock.calls.map((call: string[]) => splitUrl(call[0]).params.getAll("id").length)).toEqual([
      LOOKUP_CHUNK_SIZE,
      1,
    ])
    expect(result).toHaveLength(LOOKUP_CHUNK_SIZE + 1)
  })

  it("returns [] when the request is rejected (e.g. 403)", async () => {
    const network = createNetwork(async () => {
      throw new SignalOpenstackApiError("Forbidden", 403)
    })

    expect(await fetchNetworkSummaries(network, ["net-1"])).toEqual([])
  })

  it("returns [] for a resolved non-ok response", async () => {
    const network = createNetwork(async () => jsonResponse({}, false, 500))

    expect(await fetchNetworkSummaries(network, ["net-1"])).toEqual([])
  })

  it("returns [] when the response doesn't match the schema", async () => {
    const network = createNetwork(async () => jsonResponse({ invalid: true }))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(await fetchNetworkSummaries(network, ["net-1"], "test.networks")).toEqual([])
    expect(consoleError).toHaveBeenCalledWith("Zod Parsing Error in test.networks:", expect.anything())
    consoleError.mockRestore()
  })
})

describe("fetchSubnetSummaries", () => {
  it("requests the given fields", async () => {
    const network = createNetwork(async () =>
      jsonResponse({ subnets: [{ id: "subnet-1", name: "private-sub", cidr: "10.0.0.0/24" }] })
    )

    const result = await fetchSubnetSummaries(network, ["subnet-1"], ["id", "name", "cidr"])

    expect(result).toEqual([{ id: "subnet-1", name: "private-sub", cidr: "10.0.0.0/24" }])
    const { path, params } = splitUrl(network.get.mock.calls[0][0])
    expect(path).toBe("v2.0/subnets")
    expect(params.getAll("fields")).toEqual(["id", "name", "cidr"])
  })

  it("defaults to id and name", async () => {
    const network = createNetwork(async () => jsonResponse({ subnets: [] }))

    await fetchSubnetSummaries(network, ["subnet-1"])

    expect(splitUrl(network.get.mock.calls[0][0]).params.getAll("fields")).toEqual(["id", "name"])
  })

  it("returns [] on failure", async () => {
    const network = createNetwork(async () => {
      throw new SignalOpenstackApiError("Internal error", 500)
    })

    expect(await fetchSubnetSummaries(network, ["subnet-1"])).toEqual([])
  })
})

describe("fetchSecurityGroupSummaries", () => {
  it("resolves security group names", async () => {
    const network = createNetwork(async () => jsonResponse({ security_groups: [{ id: "sg-1", name: "default" }] }))

    const result = await fetchSecurityGroupSummaries(network, ["sg-1"])

    expect(result).toEqual([{ id: "sg-1", name: "default" }])
    const { path, params } = splitUrl(network.get.mock.calls[0][0])
    expect(path).toBe("v2.0/security-groups")
    expect(params.getAll("id")).toEqual(["sg-1"])
    expect(params.getAll("fields")).toEqual(["id", "name"])
  })

  it("returns [] on failure", async () => {
    const network = createNetwork(async () => {
      throw new SignalOpenstackApiError("Forbidden", 403)
    })

    expect(await fetchSecurityGroupSummaries(network, ["sg-1"])).toEqual([])
  })
})
