import { describe, expect, test } from "vitest"
import { networkResponseSchema } from "./models"

const example = {
  networks: [
    {
      admin_state_up: true,
      id: "396f12f8-521e-4b91-8e21-2e003500433a",
      name: "net3",
      "provider:network_type": "vlan",
      "provider:physical_network": "physnet1",
      "provider:segmentation_id": 1002,
      "router:external": false,
      shared: false,
      status: "ACTIVE",
      subnets: [],
      tenant_id: "20bd52ff3e1b40039c312395b04683cf",
      project_id: "20bd52ff3e1b40039c312395b04683cf",
    },
    {
      admin_state_up: true,
      id: "71c1e68c-171a-4aa2-aca5-50ea153a3718",
      name: "net2",
      "provider:network_type": "vlan",
      "provider:physical_network": "physnet1",
      "provider:segmentation_id": 1001,
      "router:external": false,
      shared: false,
      status: "ACTIVE",
      subnets: [],
      tenant_id: "20bd52ff3e1b40039c312395b04683cf",
      project_id: "20bd52ff3e1b40039c312395b04683cf",
    },
  ],
  networks_links: [
    {
      href: "http://127.0.0.1:9696/v2.0/networks.json?limit=2&marker=71c1e68c-171a-4aa2-aca5-50ea153a3718",
      rel: "next",
    },
    {
      href: "http://127.0.0.1:9696/v2.0/networks.json?limit=2&marker=396f12f8-521e-4b91-8e21-2e003500433a&page_reverse=True",
      rel: "previous",
    },
  ],
}

const example2 = {
  networks: [
    {
      admin_state_up: true,
      id: "b3680498-03da-4691-896f-ef9ee1d856a7",
      name: "net1",
      "provider:network_type": "vlan",
      "provider:physical_network": "physnet1",
      "provider:segmentation_id": 1000,
      "router:external": false,
      shared: false,
      status: "ACTIVE",
      subnets: [],
      tenant_id: "c05140b3dc7c4555afff9fab6b58edc2",
      project_id: "c05140b3dc7c4555afff9fab6b58edc2",
    },
  ],
  networks_links: [
    {
      href: "http://127.0.0.1:9696/v2.0/networks.json?limit=2&marker=b3680498-03da-4691-896f-ef9ee1d856a7&page_reverse=True",
      rel: "previous",
    },
  ],
}

describe("Project Schema Validation", () => {
  test("Valid network response should pass", () => {
    const result = networkResponseSchema.safeParse(example)
    expect(result.success).toBe(true)
  })

  test("Valid network response should pass", () => {
    const result = networkResponseSchema.safeParse(example2)
    expect(result.success).toBe(true)
  })

  test("network response without id should fail", () => {
    const result = networkResponseSchema.safeParse({
      networks: [
        {
          name: "Id missing",
        },
      ],
    })
    expect(result.success).toBe(false)
  })

  test("network response with wrong shared datatype should fail", () => {
    const result = networkResponseSchema.safeParse({
      networks: [
        {
          id: "sagsr43tgl",
          shared: "wrongType",
        },
      ],
    })
    expect(result.success).toBe(false)
  })
})
