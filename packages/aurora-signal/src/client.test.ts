import * as client from "./client"

describe("client", () => {
  describe("GET", () => {
    beforeAll(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })

    it("should respond to get", async () => {
      expect(client.get).toBeDefined()
    })

    it("should return a promise", async () => {
      expect(client.get("/", { host: "http://localhost" })).toBeInstanceOf(Promise)
    })

    it("should call fetch with the correct url", async () => {
      await client.get("/", { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: {},
        method: "GET",
      })
    })

    it("should call fetch with path as a full url", async () => {
      await client.get("http://localhost/test", { host: "http://test.com" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "GET",
      })
    })

    it("should call fetch with the correct options", async () => {
      await client.get("/", { host: "http://localhost", headers: { "Content-Type": "application/json" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: { "Content-Type": "application/json" },
        method: "GET",
      })
    })

    it("should call fetch with the correct absolute path", async () => {
      await client.get("/test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "GET",
      })
    })

    it("should call fetch with the correct relative path", async () => {
      await client.get("test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/domain/test", {
        headers: {},
        method: "GET",
      })
    })

    it("should throw an error if the response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: "error", status: 500 })
      await expect(client.get("/", { host: "http://localhost" })).rejects.toThrow("AuroraSignalApiError: error")
    })

    it("should log debug info", async () => {
      console.debug = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await client.get("/", { host: "http://localhost", debug: true })
      expect(console.debug).toHaveBeenCalledWith("Debug: url = http://localhost/, headers = {}, body = undefined")
    })
  })

  describe("HEAD", () => {
    it("should respond to head", async () => {
      expect(client.head).toBeDefined()
    })
    it("should return a promise", async () => {
      expect(client.head("/", { host: "http://localhost" })).toBeInstanceOf(Promise)
    })

    it("should call fetch with the correct method", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await client.head("/", { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: {},
        method: "HEAD",
      })
    })

    it("should call fetch with the correct options", async () => {
      await client.head("/", { host: "http://localhost", headers: { "Content-Type": "application/json" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: { "Content-Type": "application/json" },
        method: "HEAD",
      })
    })

    it("should call fetch with the correct absolute path", async () => {
      await client.head("/test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "HEAD",
      })
    })

    it("should call fetch with the correct relative path", async () => {
      await client.head("test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/domain/test", {
        headers: {},
        method: "HEAD",
      })
    })

    it("should throw an error if the response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: "error", status: 500 })
      await expect(client.head("/", { host: "http://localhost" })).rejects.toThrow("AuroraSignalApiError: error")
    })

    it("should log debug info", async () => {
      console.debug = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await client.head("/", { host: "http://localhost", debug: true })
      expect(console.debug).toHaveBeenCalledWith("Debug: url = http://localhost/, headers = {}, body = undefined")
    })

    it("should return a promise", async () => {
      expect(client.head("/", { host: "http://localhost" })).toBeInstanceOf(Promise)
    })

    it("should call fetch with the correct url", async () => {
      await client.head("/", { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: {},
        method: "HEAD",
      })
    })

    it("should call fetch with path as a full url", async () => {
      await client.head("http://localhost/test", { host: "http://test.com" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "HEAD",
      })
    })

    it("should call fetch with the correct options", async () => {
      await client.head("/", { host: "http://localhost", headers: { "Content-Type": "application/json" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: { "Content-Type": "application/json" },
        method: "HEAD",
      })
    })

    it("should call fetch with the correct absolute path", async () => {
      await client.head("/test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "HEAD",
      })
    })

    it("should call fetch with the correct relative path", async () => {
      await client.head("test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/domain/test", {
        headers: {},
        method: "HEAD",
      })
    })

    it("should throw an error if the response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: "error", status: 500 })
      await expect(client.head("/", { host: "http://localhost" })).rejects.toThrow("AuroraSignalApiError: error")
    })

    it("should log debug info", async () => {
      console.debug = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await client.head("/", { host: "http://localhost", debug: true })
      expect(console.debug).toHaveBeenCalledWith("Debug: url = http://localhost/, headers = {}, body = undefined")
    })
  })

  describe("DEL", () => {
    it("should respond to del", async () => {
      expect(client.del).toBeDefined()
    })
    it("should return a promise", async () => {
      expect(client.del("http://loclahost", {})).toBeInstanceOf(Promise)
    })

    it("should call fetch with the correct method", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await client.del("/", { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: {},
        method: "DELETE",
      })
    })

    it("should call fetch with the correct options", async () => {
      await client.del("/", { host: "http://localhost", headers: { "Content-Type": "application/json" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
      })
    })

    it("should call fetch with the correct absolute path", async () => {
      await client.del("/test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "DELETE",
      })
    })

    it("should call fetch with the correct relative path", async () => {
      await client.del("test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/domain/test", {
        headers: {},
        method: "DELETE",
      })
    })

    it("should throw an error if the response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: "error", status: 500 })
      await expect(client.del("/", { host: "http://localhost" })).rejects.toThrow("AuroraSignalApiError: error")
    })

    it("should log debug info", async () => {
      console.debug = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await client.del("/", { host: "http://localhost", debug: true })
      expect(console.debug).toHaveBeenCalledWith("Debug: url = http://localhost/, headers = {}, body = undefined")
    })
  })

  describe("POST", () => {
    it("should respond to post", async () => {
      expect(client.post).toBeDefined()
    })
    it("should return a promise", async () => {
      expect(client.post("/", { test: "test" }, { host: "http://localhost" })).toBeInstanceOf(Promise)
    })
  })

  describe("PUT", () => {
    it("should respond to put", async () => {
      expect(client.put).toBeDefined()
    })
    it("should return a promise", async () => {
      expect(client.put("/", { test: "test" }, { host: "http://localhost" })).toBeInstanceOf(Promise)
    })
  })

  describe("PATCH", () => {
    it("should respond to patch", async () => {
      expect(client.patch).toBeDefined()
    })
    it("should return a promise", async () => {
      expect(client.patch("http://localhost", {})).toBeInstanceOf(Promise)
    })
  })

  describe("options->queryParams", () => {
    it("should call fetch with search params", () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      client.get("/", { host: "http://localhost", queryParams: { test: "test", region: "region2" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/?test=test&region=region2", {
        headers: {},
        method: "GET",
      })
    })

    it("should convert array and call fetch with search params", () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      client.get("/", { host: "http://localhost", queryParams: { test: ["test", "test2"] } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/?test=test&test=test2", {
        headers: {},
        method: "GET",
      })
    })
  })
})
