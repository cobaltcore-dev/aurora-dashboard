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
  it("maps integers to labels", () => {
    expect(powerStateLabel(1)).toBe("RUNNING")
    expect(powerStateLabel(4)).toBe("SHUTDOWN")
    expect(powerStateLabel(undefined)).toBe("")
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

  it("returns undefined on schema parse failure", async () => {
    const compute = mockCompute([{ servers: [{ name: "missing-id" }] }])
    expect(await fetchAllServers(compute)).toBeUndefined()
  })
})
