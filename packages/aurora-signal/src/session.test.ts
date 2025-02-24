import { AuroraSignalSession } from "./session"

describe("session", () => {
  beforeAll(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: "2021-01-01T00:00:00Z" } }),
    })
  })

  it("should create a session", () => {
    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })
    expect(session).toBeDefined()
  })

  it("should respond to getAuthData", async () => {
    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })
    expect(session.getToken).toBeInstanceOf(Function)
  })

  it("should respond to terminate", async () => {
    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })
    expect(session.terminate).toBeInstanceOf(Function)
  })

  it("should call fetch with user, password", async () => {
    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { id: "user", password: "password", domain: { id: "domain" } },
          },
        },
      },
    })

    await session.getToken()

    expect(fetch).toHaveBeenCalledWith("http://localhost/v3/auth/tokens", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        auth: {
          identity: {
            methods: ["password"],
            password: {
              user: {
                id: "user",
                password: "password",
                domain: { id: "domain" },
              },
            },
          },
        },
      }),
    })
  })

  it("should call fetch with token credentials", async () => {
    const session = AuroraSignalSession("http://localhost", {
      auth: { identity: { methods: ["token"], token: { id: "token" } } },
    })

    await session.getToken()

    expect(fetch).toHaveBeenCalledWith("http://localhost/v3/auth/tokens", {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": "token",
        "X-Subject-Token": "token",
      },
      method: "GET",
    })
  })

  it("should call fetch with application credentials", async () => {
    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["application_credential"],
          application_credential: {
            id: "423f19a4ac1e4f48bbb4180756e6eb6c",
            secret: "secret",
          },
        },
      },
    })

    await session.getToken()

    expect(fetch).toHaveBeenCalledWith("http://localhost/v3/auth/tokens", {
      headers: { "Content-Type": "application/json" },
      method: "POST",
      body: JSON.stringify({
        auth: {
          identity: {
            methods: ["application_credential"],
            application_credential: { id: "423f19a4ac1e4f48bbb4180756e6eb6c", secret: "secret" },
          },
        },
      }),
    })
  })

  it("should fetch once", async () => {
    const date = new Date()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: `${date.getFullYear() + 1}-01-01T00:00:00Z` } }),
    })

    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })

    await session.getToken()
    await session.getToken()
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("should refetch data if expired", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: "2021-01-01T00:00:00Z" } }),
    })

    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })

    await session.getToken()
    await session.getToken()
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("should fetch and set data to session", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: "2021-01-01T00:00:00Z" } }),
    })

    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })

    const token = await session.getToken()
    expect(token?.authToken).toBe("token")
    expect(token?.tokenData).toEqual({ expires_at: "2021-01-01T00:00:00Z" })
  })

  it("should create token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: "2021-01-01T00:00:00Z" } }),
    })

    const session = AuroraSignalSession("http://localhost", {
      auth: {
        identity: {
          methods: ["token"],
          token: { id: "token" },
        },
        scope: { project: { id: "project" } },
      },
    })

    await session.getToken()
    expect(fetch).toHaveBeenCalledWith("http://localhost/v3/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth: {
          identity: {
            methods: ["token"],
            token: { id: "token" },
          },
          scope: { project: { id: "project" } },
        },
      }),
    })
  })

  it("should validate token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: "2021-01-01T00:00:00Z" } }),
    })

    const session = AuroraSignalSession("http://localhost", {
      auth: { identity: { methods: ["token"], token: { id: "token" } } },
    })

    await session.getToken()
    expect(fetch).toHaveBeenCalledWith("http://localhost/v3/auth/tokens", {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-Auth-Token": "token", "X-Subject-Token": "token" },
    })
  })
})
