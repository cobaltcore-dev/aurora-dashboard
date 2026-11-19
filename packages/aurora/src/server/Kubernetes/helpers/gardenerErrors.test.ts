import { describe, it, expect } from "vitest"
import { SignalOpenstackApiError, SignalOpenstackError } from "@cobaltcore-dev/signal-openstack"
import { detectErrorBody, mapGardenerError, mapGardenerStatus } from "./gardenerErrors"

const ctx = (valid: boolean) => ({ validateSession: () => valid })
const idle = () => new AbortController().signal

describe("mapGardenerStatus", () => {
  it.each([
    [400, "BAD_REQUEST"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [422, "UNPROCESSABLE_CONTENT"],
    [429, "TOO_MANY_REQUESTS"],
    [502, "BAD_GATEWAY"],
    [503, "BAD_GATEWAY"],
    [504, "GATEWAY_TIMEOUT"],
    [500, "INTERNAL_SERVER_ERROR"],
    [418, "INTERNAL_SERVER_ERROR"],
  ])("maps %i to %s without a cause", (status, code) => {
    const error = mapGardenerStatus(status, "boom", true)
    expect(error.code).toBe(code)
    expect(error.message).toBe("boom")
    expect(error.cause).toBeUndefined()
  })

  it("maps 401 to UNAUTHORIZED when the session is invalid", () => {
    const error = mapGardenerStatus(401, "nope", false)
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.cause).toBeUndefined()
  })

  it("maps 401 to BAD_GATEWAY when the session is still valid", () => {
    const error = mapGardenerStatus(401, "nope", true)
    expect(error.code).toBe("BAD_GATEWAY")
    expect(error.message).toBe("The Kubernetes service did not accept the session credentials.")
    expect(error.cause).toBeUndefined()
  })

  it("uses a generic message when Gardener sent none", () => {
    expect(mapGardenerStatus(404, undefined, true).message).toBe("Kubernetes service request failed (404).")
  })
})

describe("detectErrorBody", () => {
  it("detects a Status Failure", () => {
    expect(detectErrorBody({ kind: "Status", status: "Failure", code: 403, message: "forbidden" })).toEqual({
      status: 403,
      message: "forbidden",
    })
  })

  it("defaults a Status Failure without code to 500", () => {
    expect(detectErrorBody({ kind: "Status", status: "Failure" })).toEqual({ status: 500, message: undefined })
  })

  it("ignores a Status Success", () => {
    expect(detectErrorBody({ kind: "Status", status: "Success" })).toBeNull()
  })

  it("detects the Elektra envelope", () => {
    expect(detectErrorBody({ error: "API Error", code: 404, message: "x" })).toEqual({ status: 404, message: "x" })
  })

  it.each([{ data: {} }, [], null, "text"])("returns null for %j", (body) => {
    expect(detectErrorBody(body)).toBeNull()
  })
})

describe("mapGardenerError", () => {
  it("maps a rejected API error by status", () => {
    const result = mapGardenerError(new SignalOpenstackApiError("denied", 403), ctx(true), idle()) as {
      code: string
      cause?: unknown
    }
    expect(result.code).toBe("FORBIDDEN")
    expect(result.cause).toBeUndefined()
  })

  it("passes the session validity to the 401 mapping", () => {
    const error = new SignalOpenstackApiError("Unauthorized", 401)
    expect((mapGardenerError(error, ctx(true), idle()) as { code: string }).code).toBe("BAD_GATEWAY")
    expect((mapGardenerError(error, ctx(false), idle()) as { code: string }).code).toBe("UNAUTHORIZED")
  })

  it("maps a timeout to GATEWAY_TIMEOUT whatever the error class", () => {
    const error = new SignalOpenstackApiError("The operation was aborted due to timeout", 500)
    expect((mapGardenerError(error, ctx(true), AbortSignal.abort()) as { code: string }).code).toBe("GATEWAY_TIMEOUT")
  })

  it("keeps a 500 as INTERNAL_SERVER_ERROR when the timeout did not fire", () => {
    const error = new SignalOpenstackApiError("The operation was aborted due to timeout", 500)
    expect((mapGardenerError(error, ctx(true), idle()) as { code: string }).code).toBe("INTERNAL_SERVER_ERROR")
  })

  it("maps a client cancel to CLIENT_CLOSED_REQUEST", () => {
    const result = mapGardenerError(new SignalOpenstackError("Request canceled"), ctx(true), idle())
    expect((result as { code: string }).code).toBe("CLIENT_CLOSED_REQUEST")
  })

  it("returns unknown errors unchanged", () => {
    const error = new Error("other")
    expect(mapGardenerError(error, ctx(true), idle())).toBe(error)
  })
})
