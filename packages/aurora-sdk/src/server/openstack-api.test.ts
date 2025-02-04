import { createToken } from "./openstack-api"
import { Token } from "./types"
import { vi, it, expect, describe, beforeAll } from "vitest"

vi.stubGlobal(
  "fetch",
  vi.fn(() => {
    return Promise.resolve({
      ok: true,
      status: 201,
      headers: new Headers({
        "X-Subject-Token": "mocked-auth-token-12345",
      }),
      json: async () => ({
        token: {
          audit_ids: ["3T2dc1CGQxyJsHdDu1xkcw"],
          catalog: [
            {
              endpoints: [
                {
                  id: "068d1b359ee84b438266cb736d81de97",
                  interface: "public",
                  region: "RegionOne",
                  region_id: "RegionOne",
                  url: "http://example.com/identity",
                },
                {
                  id: "8bfc846841ab441ca38471be6d164ced",
                  interface: "admin",
                  region: "RegionOne",
                  region_id: "RegionOne",
                  url: "http://example.com/identity",
                },
                {
                  id: "beb6d358c3654b4bada04d4663b640b9",
                  interface: "internal",
                  region: "RegionOne",
                  region_id: "RegionOne",
                  url: "http://example.com/identity",
                },
              ],
              type: "identity",
              id: "050726f278654128aba89757ae25950c",
              name: "keystone",
            },
          ],
          expires_at: "2015-11-07T02:58:43.578887Z",
          issued_at: "2015-11-07T01:58:43.578929Z",
          methods: ["password"],
          roles: [
            {
              id: "51cc68287d524c759f47c811e6463340",
              name: "admin",
            },
          ],
          system: { all: true },
          user: {
            domain: { id: "default", name: "Default" },
            id: "ee4dfb6e5540447cb3741905149d9b6e",
            name: "admin",
            password_expires_at: "2016-11-06T15:32:17.000000",
          },
        },
      }),
    })
  })
)

describe("openstack-api", () => {
  let data: { authToken?: string | null; token?: Token | null }
  beforeAll(async () => {
    data = await createToken({
      endpointUrl: "http://example.com",
      domain: "example",
      user: "example",
      password: "example",
    })
  })

  it("should create a token", async () => {
    expect(data).toBeDefined()
  })
  it("should return an authToken", async () => {
    expect(data.authToken).toEqual("mocked-auth-token-12345")
  })
  it("should return a token", async () => {
    expect(data.token).toBeDefined()
  })
  it("should return a token with the correct user", async () => {
    expect(data.token?.user.name).toEqual("admin")
  })
  it("should return a token with the correct domain", async () => {
    expect(data.token?.user.domain.name).toEqual("Default")
  })
  it("should return a token with the correct roles", async () => {
    expect(data.token?.roles[0].name).toEqual("admin")
  })
  it("should return a token with the correct catalog", async () => {
    expect(data.token?.catalog?.[0].name).toEqual("keystone")
  })
})
