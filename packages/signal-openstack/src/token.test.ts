import { SignalOpenstackToken } from "./token"

describe("Token", () => {
  it("should create a token", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token).toBeDefined()
  })

  it("should return isExpired", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.isExpired()).toBe(true)
  })

  it("should return authToken", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.authToken).toBe("token")
  })

  it("should return availableRegions", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [
          {
            endpoints: [
              { id: "123", region: "region", region_id: "region", interface: "public", url: "http://localhost/name" },
            ],
            id: "id",
            name: "name",
            type: "type",
          },
        ],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.availableRegions).toEqual(["region"])
  })

  it("should return empty availableRegions", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.availableRegions).toEqual([])
  })

  it("should return true for hasRole", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [{ id: "id", name: "name" }],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.hasRole("name")).toBe(true)
  })

  it("should return false for hasRole", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [{ id: "id", name: "name" }],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.hasRole("other")).toBe(false)
  })

  it("should return true for hasService", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [
          {
            endpoints: [
              { id: "123", region: "region", region_id: "region", interface: "public", url: "http://localhost/name" },
            ],
            id: "id",
            name: "name",
            type: "type",
          },
        ],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.hasService("name")).toBe(true)
  })

  it("should return true for hasService by type", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [
          {
            endpoints: [
              { id: "123", region: "region", region_id: "region", interface: "public", url: "http://localhost/name" },
            ],
            id: "id",
            name: "name",
            type: "type",
          },
        ],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.hasService("type")).toBe(true)
  })

  it("should return null serviceEndpoint if endpoints are empty", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [{ id: "id", name: "name", type: "type", endpoints: [] }],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.serviceEndpoint("type", { region: "", interfaceName: "" })).toBe(null)
  })

  it("should return serviceEndpoint for empty region", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [
          {
            endpoints: [
              { id: "123", region: "region", region_id: "region", interface: "public", url: "http://localhost/name" },
            ],
            id: "id",
            name: "name",
            type: "type",
          },
        ],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.serviceEndpoint("type", { region: "", interfaceName: "public" })).toBe("http://localhost/name")
  })

  it("should return serviceEndpoint for specific region", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [
          {
            endpoints: [
              {
                id: "123",
                region: "region",
                region_id: "region1",
                interface: "public",
                url: "http://localhost/region1",
              },
              {
                id: "123",
                region: "region",
                region_id: "region2",
                interface: "public",
                url: "http://localhost/region2",
              },
            ],
            id: "id",
            name: "name",
            type: "type",
          },
          {
            endpoints: [
              {
                id: "123",
                region: "region2",
                region_id: "region2",
                interface: "public",
                url: "http://localhost/region2",
              },
            ],
            id: "id",
            name: "name2",
            type: "type2",
          },
        ],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.serviceEndpoint("type", { region: "region2", interfaceName: "public" })).toBe(
      "http://localhost/region2"
    )
  })
  it("should return serviceEndpoint for specific region and interface", () => {
    const token = SignalOpenstackToken({
      tokenData: {
        catalog: [
          {
            endpoints: [
              {
                id: "123",
                region: "region1",
                region_id: "region1",
                interface: "public",
                url: "http://localhost/public",
              },
              {
                id: "123",
                region: "region1",
                region_id: "region1",
                interface: "internal",
                url: "http://localhost/internal",
              },
            ],
            id: "id",
            name: "name",
            type: "type",
          },
          {
            endpoints: [
              {
                id: "123",
                region: "region2",
                region_id: "region2",
                interface: "public",
                url: "http://localhost/region2",
              },
            ],
            id: "id",
            name: "name2",
            type: "type2",
          },
        ],
        expires_at: "2021-01-01T00:00:00Z",
        issued_at: "2021-01-01T00:00:00Z",
        methods: [],
        roles: [],
        system: { all: true },
        user: {
          domain: { id: "id", name: "name" },
          id: "id",
          name: "name",
          password_expires_at: "2021-01-01T00:00:00Z",
        },
      },
      authToken: "token",
    })
    expect(token.serviceEndpoint("type", { region: "region1", interfaceName: "internal" })).toBe(
      "http://localhost/internal"
    )
  })
})
