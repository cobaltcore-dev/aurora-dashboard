import { SignalOpenstackSession } from "./session"

describe("session", () => {
  beforeAll(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: "2021-01-01T00:00:00Z" } }),
    })
  })

  it("should create a session", async () => {
    const session = await SignalOpenstackSession("http://localhost", {
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
    const session = await SignalOpenstackSession("http://localhost", {
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
    const session = await SignalOpenstackSession("http://localhost", {
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
    await SignalOpenstackSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { id: "user", password: "password", domain: { id: "domain" } },
          },
        },
      },
    })

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
      duplex: "half",
      signal: undefined,
    })
  })

  it("should call fetch with token credentials", async () => {
    await SignalOpenstackSession("http://localhost", {
      auth: { identity: { methods: ["token"], token: { id: "token" } } },
    })

    expect(fetch).toHaveBeenCalledWith("http://localhost/v3/auth/tokens", {
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": "token",
        "X-Subject-Token": "token",
      },
      method: "GET",
      body: undefined,
      duplex: "half",
      signal: undefined,
    })
  })

  it("should call fetch with application credentials", async () => {
    await SignalOpenstackSession("http://localhost", {
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
      duplex: "half",
      signal: undefined,
    })
  })

  it("should fetch once", async () => {
    const date = new Date()
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: `${date.getFullYear() + 1}-01-01T00:00:00Z` } }),
    })

    await SignalOpenstackSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("should fetch and set data to session", async () => {
    const date = new Date()
    const dateString = `${date.getFullYear() + 1}-01-01T00:00:00Z`
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: dateString } }),
    })

    const session = await SignalOpenstackSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })

    const token = session.getToken()
    expect(token?.authToken).toBe("token")
    expect(token?.tokenData).toEqual({ expires_at: dateString })
  })

  it("should create token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: "2021-01-01T00:00:00Z" } }),
    })

    await SignalOpenstackSession("http://localhost", {
      auth: {
        identity: {
          methods: ["token"],
          token: { id: "token" },
        },
        scope: { project: { id: "project" } },
      },
    })

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
      duplex: "half",
      signal: undefined,
    })
  })

  it("should validate token", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: "2021-01-01T00:00:00Z" } }),
    })

    await SignalOpenstackSession("http://localhost", {
      auth: { identity: { methods: ["token"], token: { id: "token" } } },
    })

    expect(fetch).toHaveBeenCalledWith("http://localhost/v3/auth/tokens", {
      method: "GET",
      headers: { "Content-Type": "application/json", "X-Auth-Token": "token", "X-Subject-Token": "token" },
      body: undefined,
      duplex: "half",
      signal: undefined,
    })
  })

  it("should rescope token", async () => {
    const date = new Date()
    const dateString = `${date.getFullYear() + 1}-01-01T00:00:00Z`
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: { expires_at: dateString } }),
    })

    const session = await SignalOpenstackSession("http://localhost", {
      auth: {
        identity: {
          methods: ["password"],
          password: {
            user: { name: "user", domain: { name: "domain" }, password: "password" },
          },
        },
      },
    })

    await session.rescope({ project: { id: "project" } })
    expect(fetch).toHaveBeenLastCalledWith("http://localhost/v3/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Auth-Token": "token" },
      body: JSON.stringify({
        auth: {
          identity: {
            methods: ["token"],
            token: { id: "token" },
          },
          scope: { project: { id: "project" } },
        },
      }),
      duplex: "half",
      signal: undefined,
    })
  })
})
