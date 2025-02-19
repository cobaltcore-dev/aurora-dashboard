import * as authApi from "./authApi"

describe("authApi", () => {
  it("should be defined", () => {
    expect(authApi).toBeDefined()
  })

  it("should have a createToken function", () => {
    expect(authApi.createToken).toBeDefined()
  })

  it("should have a validateToken function", () => {
    expect(authApi.validateToken).toBeDefined()
  })

  it("should have a rescopeToken function", () => {
    expect(authApi.rescopeToken).toBeDefined()
  })

  it("should have a getAuthDomains function", () => {
    expect(authApi.getAuthDomains).toBeDefined()
  })

  it("should have a getAuthProjects function", () => {
    expect(authApi.getAuthProjects).toBeDefined()
  })

  describe("createToken", () => {
    beforeAll(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers({ "X-Subject-Token": "token" }),
      })
    })

    it("should call fetch with ", () => {
      authApi.createToken({
        user: "user",
        password: "password",
        domainName: "domainName",
      })

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/tokens"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth: {
            identity: {
              methods: ["password"],
              password: {
                user: {
                  name: "user",
                  password: "password",
                  domain: { name: "domainName" },
                },
              },
            },
          },
        }),
      })
    })
  })

  describe("validateToken", () => {
    beforeAll(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        heders: new Headers({ "X-Subject-Token": "token" }),
        json: () => Promise.resolve({}),
      })
    })

    it("should call fetch with ", () => {
      authApi.validateToken("token")

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/tokens"), {
        method: "GET",
        headers: { "X-Auth-Token": "token", "X-Subject-Token": "token" },
      })
    })
  })

  describe("rescopeToken", () => {
    beforeAll(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
        headers: new Headers({ "X-Subject-Token": "token" }),
      })
    })

    it("should call fetch with ", () => {
      authApi.rescopeToken("token", { project: { id: "id" } })

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/tokens"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Auth-Token": "token" },
        body: JSON.stringify({
          auth: {
            identity: {
              methods: ["token"],
              token: {
                id: "token",
              },
            },
            scope: {
              project: { id: "id" },
            },
          },
        }),
      })
    })
  })

  describe("getAuthDomains", () => {
    beforeAll(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })

    it("should call fetch with ", () => {
      authApi.getAuthDomains("token")

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/domains"), {
        method: "GET",
        headers: { "X-Auth-Token": "token" },
      })
    })
  })

  describe("getAuthProjects", () => {
    beforeAll(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
    })

    it("should call fetch with ", () => {
      authApi.getAuthProjects("token")

      expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/auth/projects"), {
        method: "GET",
        headers: { "X-Auth-Token": "token" },
      })
    })
  })
})
