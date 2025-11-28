import { Mock } from "vitest"
import { SignalOpenstackService } from "./service"
import { SignalOpenstackToken, SignalOpenstackTokenType } from "./token"

const TestToken = {
  expires_at: "2021-01-01T00:00:00Z",
  catalog: [
    {
      endpoints: [
        {
          id: "id",
          interface: "public",
          region: "region",
          region_id: "region_id",
          url: "http://localhost/service1",
        },
      ],
      type: "type",
      id: "id",
      name: "service1",
    },
  ],
  issued_at: "2021-01-01T00:00:00Z",
  methods: ["method"],
  roles: [
    {
      id: "id",
      name: "name",
    },
  ],
  system: {
    all: true,
  },
  user: {
    domain: {
      id: "id",
      name: "name",
    },
    id: "id",
    name: "name",
    password_expires_at: "2021-01-01T00:00:00Z",
  },
}

describe("service", () => {
  let token: SignalOpenstackTokenType

  beforeAll(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "X-Subject-Token": "token" }),
      json: () => ({ token: TestToken }),
    })
    token = SignalOpenstackToken({ tokenData: TestToken, authToken: "token" })
  })

  it("should create a service", () => {
    const service = SignalOpenstackService("name", token, {})
    expect(service).toBeInstanceOf(Object)
  })

  describe("Regular methods", () => {
    it("should respond to head", async () => {
      const service = SignalOpenstackService("name", token, {})
      expect(service.head).toBeInstanceOf(Function)
    })

    it("should respond to get", async () => {
      const service = SignalOpenstackService("name", token, {})
      expect(service.get).toBeInstanceOf(Function)
    })

    it("should respond to post", async () => {
      const service = SignalOpenstackService("name", token, {})
      expect(service.post).toBeInstanceOf(Function)
    })

    it("should respond to put", async () => {
      const service = SignalOpenstackService("name", token, {})
      expect(service.put).toBeInstanceOf(Function)
    })

    it("should respond to patch", async () => {
      const service = SignalOpenstackService("name", token, {})
      expect(service.patch).toBeInstanceOf(Function)
    })

    it("should respond to del", async () => {
      const service = SignalOpenstackService("name", token, {})
      expect(service.del).toBeInstanceOf(Function)
    })
  })

  describe("Cancellable methods", () => {
    it("should respond to cancellableHead", () => {
      const service = SignalOpenstackService("service1", token, {})
      expect(service.cancellableHead).toBeInstanceOf(Function)
    })

    it("should respond to cancellableGet", () => {
      const service = SignalOpenstackService("service1", token, {})
      expect(service.cancellableGet).toBeInstanceOf(Function)
    })

    it("should respond to cancellablePost", () => {
      const service = SignalOpenstackService("service1", token, {})
      expect(service.cancellablePost).toBeInstanceOf(Function)
    })

    it("should respond to cancellablePut", () => {
      const service = SignalOpenstackService("service1", token, {})
      expect(service.cancellablePut).toBeInstanceOf(Function)
    })

    it("should respond to cancellablePatch", () => {
      const service = SignalOpenstackService("service1", token, {})
      expect(service.cancellablePatch).toBeInstanceOf(Function)
    })

    it("should respond to cancellableDel", () => {
      const service = SignalOpenstackService("service1", token, {})
      expect(service.cancellableDel).toBeInstanceOf(Function)
    })

    it("should return cancellable object from cancellableGet", () => {
      const service = SignalOpenstackService("service1", token, {})
      const result = service.cancellableGet("path")

      expect(result).toHaveProperty("promise")
      expect(result).toHaveProperty("cancel")
      expect(result.promise).toBeInstanceOf(Promise)
      expect(typeof result.cancel).toBe("function")
    })

    it("should return cancellable object from cancellablePost", () => {
      const service = SignalOpenstackService("service1", token, {})
      const result = service.cancellablePost("path", { data: "test" })

      expect(result).toHaveProperty("promise")
      expect(result).toHaveProperty("cancel")
      expect(result.promise).toBeInstanceOf(Promise)
      expect(typeof result.cancel).toBe("function")
    })

    it("should call fetch with AbortSignal for cancellableGet", () => {
      const service = SignalOpenstackService("service1", token, {})
      service.cancellableGet("path")

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost/service1/path",
        expect.objectContaining({
          method: "GET",
          headers: { "X-Auth-Token": "token" },
          signal: expect.any(AbortSignal),
        })
      )
    })

    it("should call fetch with AbortSignal for cancellablePost", () => {
      const service = SignalOpenstackService("service1", token, {})
      const formData = new FormData()
      formData.append("file", new Blob(["test"]))

      service.cancellablePost("upload", formData)

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost/service1/upload",
        expect.objectContaining({
          method: "POST",
          body: formData,
          signal: expect.any(AbortSignal),
        })
      )
    })

    it("should cancel request when cancel is called", () => {
      const service = SignalOpenstackService("service1", token, {})
      const request = service.cancellableGet("path")

      // Get the signal from the fetch call
      const fetchCall = (globalThis.fetch as Mock).mock.calls[(globalThis.fetch as Mock).mock.calls.length - 1][1]
      const signal = fetchCall.signal

      expect(signal.aborted).toBe(false)

      request.cancel()

      expect(signal.aborted).toBe(true)
    })

    it("should handle cancellation with options", () => {
      const fetchCall = (globalThis.fetch as Mock).mock.calls[(globalThis.fetch as Mock).mock.calls.length - 1][1]

      expect(fetchCall.signal).toBeInstanceOf(AbortSignal)
      expect(fetchCall.headers["X-Auth-Token"]).toBe("token")
    })

    it("should handle file upload cancellation", () => {
      const service = SignalOpenstackService("service1", token, {})
      const formData = new FormData()
      const largeBlob = new Blob(["x".repeat(1000000)]) // 1MB
      formData.append("file", largeBlob)

      const upload = service.cancellablePost("upload", formData)

      // Verify it's cancellable
      expect(typeof upload.cancel).toBe("function")

      // Cancel it
      upload.cancel()

      // Verify signal was aborted
      const fetchCall = (globalThis.fetch as Mock).mock.calls[(globalThis.fetch as Mock).mock.calls.length - 1][1]
      expect(fetchCall.signal.aborted).toBe(true)
    })

    it("should reject promise when cancelled", async () => {
      // Mock fetch to simulate abort behavior
      const abortError = new Error("The operation was aborted")
      abortError.name = "AbortError"

      globalThis.fetch = vi.fn().mockRejectedValue(abortError)

      const service = SignalOpenstackService("service1", token, {})
      const request = service.cancellableGet("path")

      request.cancel()

      await expect(request.promise).rejects.toThrow("Request canceled")
    })
  })

  describe("serviceOptions", () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "X-Subject-Token": "token" }),
        json: () => ({ token: TestToken }),
      })
    })

    it("should respond to head with options", async () => {
      const service = SignalOpenstackService("service1", token, {})
      expect(service.head("path", {})).toBeInstanceOf(Promise)
    })

    it("should respond to get with options: region", async () => {
      const service = SignalOpenstackService("service1", token, { region: "region" })
      expect(service.get("path", {})).toBeInstanceOf(Promise)
    })

    it("should throw error for unknown region", async () => {
      const service = SignalOpenstackService("service1", token, { region: "region1" })
      await expect(service.get("path", {})).rejects.toThrow(
        "Service service1 (region: region1, interface: public) not found."
      )
    })

    it("should respond to get with options: interface", async () => {
      const service = SignalOpenstackService("service1", token, { region: "region", interfaceName: "public" })
      expect(service.get("path", {})).toBeInstanceOf(Promise)
    })

    it("should throw error for unknown interface", async () => {
      const service = SignalOpenstackService("service1", token, { region: "region", interfaceName: "unknown" })
      await expect(service.get("path", {})).rejects.toThrow(
        "Service service1 (region: region, interface: unknown) not found."
      )
    })

    it("should respond to get with options", async () => {
      const service = SignalOpenstackService("service1", token, { region: "region", interfaceName: "public" })
      await service.get("path", {})
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost/service1/path",
        expect.objectContaining({
          method: "GET",
          headers: { "X-Auth-Token": "token" },
        })
      )
    })

    it("should overwrite options", async () => {
      const service = SignalOpenstackService("service1", token, { region: "unknown", interfaceName: "unknown" })
      await service.get("test", { region: "region", interfaceName: "public" })
      expect(globalThis.fetch).toHaveBeenLastCalledWith(
        "http://localhost/service1/test",
        expect.objectContaining({
          method: "GET",
          headers: { "X-Auth-Token": "token" },
        })
      )
    })

    it("should apply options to cancellable methods", () => {
      const service = SignalOpenstackService("service1", token, { region: "region", interfaceName: "public" })
      service.cancellableGet("path", {})

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost/service1/path",
        expect.objectContaining({
          method: "GET",
          headers: { "X-Auth-Token": "token" },
          signal: expect.any(AbortSignal),
        })
      )
    })

    it("should override service options in cancellable methods", () => {
      const service = SignalOpenstackService("service1", token, { region: "unknown" })
      service.cancellableGet("path", { region: "region", interfaceName: "public" })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://localhost/service1/path",
        expect.objectContaining({
          method: "GET",
          headers: { "X-Auth-Token": "token" },
          signal: expect.any(AbortSignal),
        })
      )
    })
  })

  describe("Real-world scenarios", () => {
    beforeEach(() => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ "X-Subject-Token": "token" }),
        json: () => ({ token: TestToken }),
      })
    })

    it("should handle multiple concurrent cancellable requests", () => {
      const service = SignalOpenstackService("service1", token, {})

      service.cancellableGet("path1")
      const request2 = service.cancellableGet("path2")
      service.cancellableGet("path3")

      // Cancel only the second one
      request2.cancel()

      const calls = (globalThis.fetch as Mock).mock.calls
      expect(calls[calls.length - 3][1].signal.aborted).toBe(false) // request1
      expect(calls[calls.length - 2][1].signal.aborted).toBe(true) // request2
      expect(calls[calls.length - 1][1].signal.aborted).toBe(false) // request3
    })

    it("should handle image upload scenario", () => {
      const service = SignalOpenstackService("service1", token, {})

      const imageFile = new Blob(["fake image data"], { type: "image/png" })
      const formData = new FormData()
      formData.append("file", imageFile)

      const upload = service.cancellablePost("v2/images/abc-123/file", formData)

      expect(upload.promise).toBeInstanceOf(Promise)
      expect(typeof upload.cancel).toBe("function")

      // Verify fetch was called correctly
      const fetchCall = (globalThis.fetch as Mock).mock.calls[(globalThis.fetch as Mock).mock.calls.length - 1]
      expect(fetchCall[0]).toBe("http://localhost/service1/v2/images/abc-123/file")
      expect(fetchCall[1].method).toBe("POST")
      expect(fetchCall[1].body).toBe(formData)
      expect(fetchCall[1].signal).toBeInstanceOf(AbortSignal)
    })
  })
})
