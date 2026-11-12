import { describe, it, expect, vi } from "vitest"
import { fetchAllServers, powerStateLabel } from "./serverHelpers"
import type { SignalOpenstackServiceType } from "@cobaltcore-dev/signal-openstack"

/**
 * Build a mock compute service whose get() returns, in order, the provided
 * JSON page responses. The first call (version discovery, path "") returns the
 * microversion; subsequent "servers/detail" calls return the queued pages.
 */
function mockCompute(pages: unknown[], maxVersion = "2.90"): SignalOpenstackServiceType {
  const queue = [...pages]
  const get = vi.fn(async (path: string) => {
    if (path === "") {
      return { json: async () => ({ version: { version: maxVersion, status: "CURRENT" } }) }
    }
    const body = queue.shift() ?? { servers: [] }
    return { json: async () => body }
  })
  return { get } as unknown as SignalOpenstackServiceType
}

describe("powerStateLabel", () => {
  it.each([
    [0, "NOSTATE"],
    [1, "RUNNING"],
    [3, "PAUSED"],
    [4, "SHUTDOWN"],
    [6, "CRASHED"],
    [7, "SUSPENDED"],
  ] as const)("maps %s to %s", (state, label) => {
    expect(powerStateLabel(state)).toBe(label)
  })

  it("handles unknown and missing states", () => {
    expect(powerStateLabel(99)).toBe("UNKNOWN (99)")
    expect(powerStateLabel(undefined)).toBe("")
    expect(powerStateLabel(null)).toBe("")
  })
})

describe("fetchAllServers", () => {
  it("normalizes namespaced MAC/type address keys onto flat fields", async () => {
    const compute = mockCompute([
      {
        servers: [
          {
            id: "srv-1",
            name: "web",
            addresses: {
              private: [
                {
                  addr: "10.0.0.5",
                  version: 4,
                  "OS-EXT-IPS-MAC:mac_addr": "fa:16:3e:11:22:33",
                  "OS-EXT-IPS:type": "fixed",
                },
              ],
            },
          },
        ],
      },
    ])

    const servers = await fetchAllServers(compute)
    const address = servers?.[0].addresses?.private?.[0]
    expect(address?.mac_addr).toBe("fa:16:3e:11:22:33")
    expect(address?.type).toBe("fixed")
    // Original namespaced keys are preserved by the catchall.
    expect(address?.["OS-EXT-IPS-MAC:mac_addr"]).toBe("fa:16:3e:11:22:33")
  })

  it("follows servers_links pagination via the marker", async () => {
    const compute = mockCompute([
      {
        servers: [{ id: "srv-1" }],
        servers_links: [{ rel: "next", href: "https://nova/v2.1/servers/detail?limit=1&marker=srv-1" }],
      },
      { servers: [{ id: "srv-2" }] },
    ])

    const servers = await fetchAllServers(compute)
    expect(servers?.map((s) => s.id)).toEqual(["srv-1", "srv-2"])
  })

  it("sends the Nova microversion header", async () => {
    const compute = mockCompute([{ servers: [{ id: "srv-1" }] }])
    await fetchAllServers(compute)
    const detailCall = (compute.get as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === "servers/detail")
    expect(detailCall?.[1]?.headers?.["OpenStack-API-Version"]).toMatch(/^compute \d+\.\d+$/)
  })

  it("requests 2.47 when the deployment supports it (Nova does not clamp over-max)", async () => {
    const compute = mockCompute([{ servers: [{ id: "srv-1" }] }], "2.90")
    await fetchAllServers(compute)
    const detailCall = (compute.get as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === "servers/detail")
    expect(detailCall?.[1]?.headers?.["OpenStack-API-Version"]).toBe("compute 2.47")
  })

  it("never requests above the deployment max (uses the max when below 2.47)", async () => {
    const compute = mockCompute([{ servers: [{ id: "srv-1" }] }], "2.20")
    await fetchAllServers(compute)
    const detailCall = (compute.get as ReturnType<typeof vi.fn>).mock.calls.find((c) => c[0] === "servers/detail")
    expect(detailCall?.[1]?.headers?.["OpenStack-API-Version"]).toBe("compute 2.20")
  })

  it("throws on schema parse failure (so the error isn't swallowed as empty)", async () => {
    const compute = mockCompute([{ servers: [{ name: "missing-id" }] }])
    await expect(fetchAllServers(compute)).rejects.toThrow()
  })
})
