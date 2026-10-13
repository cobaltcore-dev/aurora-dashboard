import { describe, it, expect, vi } from "vitest"
import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { requestOrThrow, pickDefined, chunk, withQuery } from "./requestHelpers"
import { RouterErrorHandlers } from "./routerHelpers"
import { DEFAULT_ERROR_NAME, HTTP_STATUS_ERROR_MAP } from "./index"

describe("requestOrThrow", () => {
  const okResponse = { ok: true, status: 200, statusText: "OK" }

  it("returns the response on success", async () => {
    await expect(requestOrThrow(() => Promise.resolve(okResponse), RouterErrorHandlers.get, "router-1")).resolves.toBe(
      okResponse
    )
  })

  it("dispatches a thrown SignalOpenstackApiError by statusCode", async () => {
    const error = await requestOrThrow(
      () => Promise.reject(new SignalOpenstackApiError("Router router-1 could not be found", 404)),
      RouterErrorHandlers.get,
      "router-1"
    ).catch((e) => e)

    expect(error).toBeInstanceOf(TRPCError)
    expect(error.code).toBe(HTTP_STATUS_ERROR_MAP[404])
    expect(error.message).toBe("Router router-1 was not found.")
  })

  it("passes the error message to the handler (quota detection)", async () => {
    await expect(
      requestOrThrow(
        () => Promise.reject(new SignalOpenstackApiError("Quota exceeded for resources: ['router'].", 409)),
        RouterErrorHandlers.create
      )
    ).rejects.toMatchObject({ code: HTTP_STATUS_ERROR_MAP[409], message: expect.stringMatching(/quota exceeded/i) })
  })

  it("maps a resolved non-ok response", async () => {
    await expect(
      requestOrThrow(
        () => Promise.resolve({ ok: false, status: 409, statusText: "Conflict" }),
        RouterErrorHandlers.delete,
        "router-1"
      )
    ).rejects.toMatchObject({ code: HTTP_STATUS_ERROR_MAP[409], message: expect.stringMatching(/attached interfaces/) })
  })

  it("maps a network failure wrapped by the client (status 500) to the default error", async () => {
    await expect(
      requestOrThrow(() => Promise.reject(new SignalOpenstackApiError("fetch failed", 500)), RouterErrorHandlers.list)
    ).rejects.toMatchObject({ code: DEFAULT_ERROR_NAME, message: "Failed to process Router: fetch failed" })
  })

  it("rethrows other errors without calling the handler", async () => {
    const handler = vi.fn()
    const original = new Error("socket hang up")

    await expect(requestOrThrow(() => Promise.reject(original), handler)).rejects.toBe(original)
    expect(handler).not.toHaveBeenCalled()
  })
})

describe("pickDefined", () => {
  it("drops undefined but keeps falsy values", () => {
    expect(pickDefined({ a: undefined, b: false, c: "", d: 0, e: null })).toEqual({ b: false, c: "", d: 0, e: null })
  })
})

describe("chunk", () => {
  it("splits items into chunks of the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it("returns a single chunk when items fit", () => {
    expect(chunk([1, 2], 50)).toEqual([[1, 2]])
  })

  it("returns no chunks for an empty array", () => {
    expect(chunk([], 50)).toEqual([])
  })

  it("throws for a size below 1", () => {
    expect(() => chunk([1], 0)).toThrow()
  })
})

describe("withQuery", () => {
  it("appends the query string", () => {
    expect(withQuery("v2.0/ports", new URLSearchParams([["network_id", "net-1"]]))).toBe("v2.0/ports?network_id=net-1")
  })

  it("returns the base URL when there are no params", () => {
    expect(withQuery("v2.0/ports", new URLSearchParams())).toBe("v2.0/ports")
  })
})
