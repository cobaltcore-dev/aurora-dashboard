import * as client from "./client"
import { SignalOpenstackError } from "./error"
import { Mock } from "vitest"

describe("client", () => {
  describe("GET", () => {
    beforeEach(() => {
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
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with path as a full url", async () => {
      await client.get("http://localhost/test", { host: "http://test.com" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "GET",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct options", async () => {
      await client.get("/", { host: "http://localhost", headers: { "Content-Type": "application/json" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: { "Content-Type": "application/json" },
        method: "GET",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct absolute path", async () => {
      await client.get("/test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "GET",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct relative path", async () => {
      await client.get("test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/domain/test", {
        headers: {},
        method: "GET",
        body: undefined,
        signal: undefined,
      })
    })
    it("should throw an error if the response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: "error", status: 500, json: vi.fn() })
      await expect(client.get("/", { host: "http://localhost" })).rejects.toThrow("error")
    })
  })

  describe("cancellableGet", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      // Don't mock AbortController globally - use real one
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("should be defined", () => {
      expect(client.cancellableGet).toBeDefined()
    })

    it("should return an object with promise and cancel method", () => {
      const result = client.cancellableGet("/", { host: "http://localhost" })
      expect(result).toHaveProperty("promise")
      expect(result).toHaveProperty("cancel")
      expect(result.promise).toBeInstanceOf(Promise)
      expect(typeof result.cancel).toBe("function")
    })

    it("should call fetch with the correct parameters", () => {
      client.cancellableGet("/test", { host: "http://localhost", headers: { "X-Custom": "value" } })
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost/test",
        expect.objectContaining({
          headers: { "X-Custom": "value" },
          method: "GET",
          signal: expect.any(AbortSignal), // ✅ Use real AbortSignal
        })
      )
    })

    it("should cancel the request when cancel is called", async () => {
      // Use real AbortController, spy on the signal
      const request = client.cancellableGet("/", { host: "http://localhost" })

      // Get the signal that was passed to fetch
      const fetchCall = (global.fetch as Mock).mock.calls[0][1]
      const signal = fetchCall.signal

      // Spy on addEventListener to verify abort event
      const abortListener = vi.fn()
      signal.addEventListener("abort", abortListener)

      request.cancel()

      expect(signal.aborted).toBe(true) // ✅ Real signal property
    })

    it("should throw SignalOpenstackError when cancelled", async () => {
      // Mock fetch to simulate abort behavior
      const abortError = new Error("The operation was aborted")
      abortError.name = "AbortError"

      global.fetch = vi.fn().mockRejectedValue(abortError)

      const request = client.cancellableGet("/", { host: "http://localhost" })
      request.cancel()

      await expect(request.promise).rejects.toThrow(SignalOpenstackError)
      await expect(request.promise).rejects.toThrow("Request canceled")
    })

    it("should resolve successfully if not cancelled", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: "test" }),
      })

      const request = client.cancellableGet("/", { host: "http://localhost" })
      const response = await request.promise

      expect(response.ok).toBe(true)
    })

    it("should handle actual cancellation during fetch", async () => {
      global.fetch = vi.fn().mockImplementation((url, options) => {
        return new Promise((resolve, reject) => {
          const signal = options?.signal as AbortSignal

          if (signal) {
            signal.addEventListener("abort", () => {
              const error = new Error("The operation was aborted")
              error.name = "AbortError"
              reject(error)
            })
          }

          // Simulate long operation
          setTimeout(() => {
            resolve({ ok: true, json: () => Promise.resolve({}) })
          }, 1000)
        })
      })

      const request = client.cancellableGet("/", { host: "http://localhost" })

      // Cancel immediately
      request.cancel()

      // Should reject with our custom error
      await expect(request.promise).rejects.toThrow("Request canceled")
    })
  })

  describe("HEAD", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })
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
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct options", async () => {
      await client.head("/", { host: "http://localhost", headers: { "Content-Type": "application/json" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: { "Content-Type": "application/json" },
        method: "HEAD",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct absolute path", async () => {
      await client.head("/test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "HEAD",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct relative path", async () => {
      await client.head("test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/domain/test", {
        headers: {},
        method: "HEAD",
        body: undefined,
        signal: undefined,
      })
    })
    it("should throw an error if the response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: "error", status: 500, json: vi.fn() })
      await expect(client.head("/", { host: "http://localhost" })).rejects.toThrow("error")
    })
    it("should return a promise", async () => {
      expect(client.head("/", { host: "http://localhost" })).toBeInstanceOf(Promise)
    })
    it("should call fetch with the correct url", async () => {
      await client.head("/", { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: {},
        method: "HEAD",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with path as a full url", async () => {
      await client.head("http://localhost/test", { host: "http://test.com" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "HEAD",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct options", async () => {
      await client.head("/", { host: "http://localhost", headers: { "Content-Type": "application/json" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: { "Content-Type": "application/json" },
        method: "HEAD",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct absolute path", async () => {
      await client.head("/test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "HEAD",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct relative path", async () => {
      await client.head("test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/domain/test", {
        headers: {},
        method: "HEAD",
        body: undefined,
        signal: undefined,
      })
    })
    it("should throw an error if the response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: "error", status: 500, json: vi.fn() })
      await expect(client.head("/", { host: "http://localhost" })).rejects.toThrow("error")
    })
  })

  describe("cancellableHead", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })

    it("should be defined", () => {
      expect(client.cancellableHead).toBeDefined()
    })

    it("should return cancellable object", () => {
      const result = client.cancellableHead("/", { host: "http://localhost" })
      expect(result).toHaveProperty("promise")
      expect(result).toHaveProperty("cancel")
    })

    it("should call fetch with HEAD method", () => {
      client.cancellableHead("/test", { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost/test",
        expect.objectContaining({
          method: "HEAD",
          signal: expect.any(AbortSignal),
        })
      )
    })
  })

  describe("DEL", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })
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
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct options", async () => {
      await client.del("/", { host: "http://localhost", headers: { "Content-Type": "application/json" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/", {
        headers: { "Content-Type": "application/json" },
        method: "DELETE",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct absolute path", async () => {
      await client.del("/test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/test", {
        headers: {},
        method: "DELETE",
        body: undefined,
        signal: undefined,
      })
    })
    it("should call fetch with the correct relative path", async () => {
      await client.del("test", { host: "http://localhost/domain" })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/domain/test", {
        headers: {},
        method: "DELETE",
        body: undefined,
        signal: undefined,
      })
    })
    it("should throw an error if the response is not ok", async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: false, statusText: "error", status: 500, json: vi.fn() })
      await expect(client.del("/", { host: "http://localhost" })).rejects.toThrow("error")
    })
    it("should log debug info", async () => {
      console.debug = vi.fn()
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      await client.del("/", { host: "http://localhost", debug: true })
      expect(console.debug).toHaveBeenCalledWith(
        "===Signal Openstack Debug: ",
        JSON.stringify(
          {
            method: "DELETE",
            path: "/",
            options: {
              host: "http://localhost",
              debug: true,
            },
            url: "http://localhost/",
          },
          null,
          2
        )
      )
    })
  })

  describe("cancellableDel", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })

    it("should be defined", () => {
      expect(client.cancellableDel).toBeDefined()
    })

    it("should return cancellable object", () => {
      const result = client.cancellableDel("/", { host: "http://localhost" })
      expect(result).toHaveProperty("promise")
      expect(result).toHaveProperty("cancel")
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

  describe("cancellablePost", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })

    it("should be defined", () => {
      expect(client.cancellablePost).toBeDefined()
    })

    it("should return cancellable object", () => {
      const result = client.cancellablePost("/", { data: "test" }, { host: "http://localhost" })
      expect(result).toHaveProperty("promise")
      expect(result).toHaveProperty("cancel")
    })

    it("should handle JSON body correctly", () => {
      client.cancellablePost("/upload", { name: "test" }, { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost/upload",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
          headers: { "Content-Type": "application/json" },
          signal: expect.any(AbortSignal),
        })
      )
    })

    it("should handle FormData body correctly", () => {
      const formData = new FormData()
      formData.append("file", new Blob(["test"]))

      client.cancellablePost("/upload", formData, { host: "http://localhost" })

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost/upload",
        expect.objectContaining({
          method: "POST",
          body: formData,
          signal: expect.any(AbortSignal),
        })
      )
    })

    it("should handle Blob body correctly", () => {
      const blob = new Blob(["test data"], { type: "text/plain" })

      client.cancellablePost("/upload", blob, { host: "http://localhost" })

      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost/upload",
        expect.objectContaining({
          method: "POST",
          body: blob,
          signal: expect.any(AbortSignal),
        })
      )
    })

    it("should cancel file upload", async () => {
      const mockAbort = vi.fn()
      global.AbortController = vi.fn().mockImplementation(() => ({
        signal: expect.any(AbortSignal),
        abort: mockAbort,
      })) as Mock

      const formData = new FormData()
      formData.append("file", new Blob(["large file content"]))

      const upload = client.cancellablePost("/upload", formData, { host: "http://localhost" })
      upload.cancel()

      expect(mockAbort).toHaveBeenCalled()
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

  describe("cancellablePut", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })

    it("should be defined", () => {
      expect(client.cancellablePut).toBeDefined()
    })

    it("should return cancellable object", () => {
      const result = client.cancellablePut("/", { data: "test" }, { host: "http://localhost" })
      expect(result).toHaveProperty("promise")
      expect(result).toHaveProperty("cancel")
    })

    it("should call fetch with PUT method", () => {
      client.cancellablePut("/resource", { name: "updated" }, { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost/resource",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "updated" }),
          signal: expect.any(AbortSignal),
        })
      )
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

  describe("cancellablePatch", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })

    it("should be defined", () => {
      expect(client.cancellablePatch).toBeDefined()
    })

    it("should return cancellable object", () => {
      const result = client.cancellablePatch("/", { data: "test" }, { host: "http://localhost" })
      expect(result).toHaveProperty("promise")
      expect(result).toHaveProperty("cancel")
    })

    it("should call fetch with PATCH method", () => {
      client.cancellablePatch("/resource", { status: "active" }, { host: "http://localhost" })
      expect(global.fetch).toHaveBeenCalledWith(
        "http://localhost/resource",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
          signal: expect.any(AbortSignal),
        })
      )
    })
  })

  describe("options->queryParams", () => {
    it("should call fetch with search params", () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      client.get("/", { host: "http://localhost", queryParams: { test: "test", region: "region2" } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/?test=test&region=region2", {
        headers: {},
        method: "GET",
        body: undefined,
        signal: undefined,
      })
    })
    it("should convert array and call fetch with search params", () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      client.get("/", { host: "http://localhost", queryParams: { test: ["test", "test2"] } })
      expect(global.fetch).toHaveBeenCalledWith("http://localhost/?test=test&test=test2", {
        headers: {},
        method: "GET",
        body: undefined,
        signal: undefined,
      })
    })
  })

  describe("File upload scenarios", () => {
    beforeEach(() => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
    })

    it("should not set Content-Type header for FormData", () => {
      const formData = new FormData()
      formData.append("file", new Blob(["test"]))

      client.post("/upload", formData, { host: "http://localhost" })

      const fetchCall = (global.fetch as Mock).mock.calls[0][1]
      expect(fetchCall.headers["Content-Type"]).toBeUndefined()
    })

    it("should set Content-Type for JSON", () => {
      client.post("/api", { data: "test" }, { host: "http://localhost" })

      const fetchCall = (global.fetch as Mock).mock.calls[0][1]
      expect(fetchCall.headers["Content-Type"]).toBe("application/json")
    })
  })
})
