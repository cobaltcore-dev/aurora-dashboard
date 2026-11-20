import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { SignalOpenstackApiError, SignalOpenstackError } from "@cobaltcore-dev/signal-openstack"
import { detectErrorBody, mapGardenerError, mapGardenerStatus, redactSecrets } from "./gardenerErrors"

const ctx = (valid: boolean) => ({ validateSession: () => valid })
const idle = () => new AbortController().signal
const testOpts = { sessionValid: true, secrets: ["tok-123", "qa-de-1:tok-123"], operation: "test", landscape: "qa" }

describe("redactSecrets", () => {
  it("replaces secrets with [redacted]", () => {
    expect(redactSecrets("Token is tok-123", ["tok-123"])).toBe("Token is [redacted]")
  })

  it("replaces longer secrets before shorter ones", () => {
    expect(redactSecrets("Token qa-de-1:tok-123", ["tok-123", "qa-de-1:tok-123"])).toBe("Token [redacted]")
  })

  it("replaces Bearer token patterns", () => {
    expect(redactSecrets("Authorization: Bearer tok-xyz", [])).toBe("Authorization: Bearer [redacted]")
  })

  it("handles multiple occurrences", () => {
    expect(redactSecrets("tok-123 and tok-123 again", ["tok-123"])).toBe("[redacted] and [redacted] again")
  })
})

describe("mapGardenerStatus", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock spy type
  let consoleErrorSpy: any

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it.each([
    [400, "BAD_REQUEST", "The Kubernetes service rejected the request."],
    [403, "FORBIDDEN", "The Kubernetes service refused the request (missing permission or exceeded quota)."],
    [404, "NOT_FOUND", "The requested Kubernetes resource was not found."],
    [409, "CONFLICT", "The cluster was changed in the meantime. Reload it and try again."],
    [422, "UNPROCESSABLE_CONTENT", "The Kubernetes service rejected the cluster definition."],
    [429, "TOO_MANY_REQUESTS", "The Kubernetes service is receiving too many requests. Try again later."],
    [502, "BAD_GATEWAY", "The Kubernetes service is temporarily unavailable."],
    [503, "BAD_GATEWAY", "The Kubernetes service is temporarily unavailable."],
    [504, "GATEWAY_TIMEOUT", "The Kubernetes service did not respond in time."],
    [500, "INTERNAL_SERVER_ERROR", "The Kubernetes service request failed."],
    [418, "INTERNAL_SERVER_ERROR", "The Kubernetes service request failed."],
  ])("maps %i to %s with fixed message (not Status body)", (status, code, message) => {
    const error = mapGardenerStatus(
      status,
      { rawMessage: "boom", isStatusBody: false },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.code).toBe(code)
    expect(error.message).toBe(message)
    expect(error.cause).toBeUndefined()
  })

  it("passes through 400 Status message", () => {
    const error = mapGardenerStatus(
      400,
      { statusMessage: "Invalid field X", isStatusBody: true },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.code).toBe("BAD_REQUEST")
    expect(error.message).toBe("Invalid field X")
  })

  it("passes through 409 Status message", () => {
    const error = mapGardenerStatus(
      409,
      {
        statusMessage: "the object has been modified; please apply your changes to the latest version",
        isStatusBody: true,
      },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.code).toBe("CONFLICT")
    expect(error.message).toBe("the object has been modified; please apply your changes to the latest version")
  })

  it("passes through 422 Status message", () => {
    const error = mapGardenerStatus(
      422,
      { statusMessage: "spec.provider.workers[0].minimum must be <= maximum", isStatusBody: true },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.code).toBe("UNPROCESSABLE_CONTENT")
    expect(error.message).toBe("spec.provider.workers[0].minimum must be <= maximum")
  })

  it("does NOT pass through 403 Status message (uses fixed message)", () => {
    const error = mapGardenerStatus(
      403,
      { statusMessage: "shoots.core.gardener.cloud is forbidden: quota exceeded", isStatusBody: true },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.code).toBe("FORBIDDEN")
    expect(error.message).toBe("The Kubernetes service refused the request (missing permission or exceeded quota).")
    expect(error.message).not.toContain("quota exceeded")
  })

  it("does NOT pass through 404 Status message", () => {
    const error = mapGardenerStatus(
      404,
      { statusMessage: 'shoots.core.gardener.cloud "test-cluster" not found', isStatusBody: true },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.code).toBe("NOT_FOUND")
    expect(error.message).toBe("The requested Kubernetes resource was not found.")
  })

  it("redacts token from 422 Status message", () => {
    const error = mapGardenerStatus(422, { statusMessage: "Failed with token tok-123", isStatusBody: true }, testOpts)
    expect(error.message).not.toContain("tok-123")
    expect(error.message).toContain("[redacted]")
  })

  it("redacts <region>:<token> from pass-through message", () => {
    const error = mapGardenerStatus(
      400,
      { statusMessage: "Auth failed: qa-de-1:tok-123", isStatusBody: true },
      testOpts
    )
    expect(error.message).not.toContain("tok-123")
    expect(error.message).not.toContain("qa-de-1:tok-123")
    expect(error.message).toContain("[redacted]")
  })

  it("redacts Bearer tokens from pass-through message", () => {
    const error = mapGardenerStatus(400, { statusMessage: "Bearer tok-xyz not valid", isStatusBody: true }, testOpts)
    expect(error.message).toContain("Bearer [redacted]")
  })

  it("caps pass-through message at 500 characters", () => {
    const longMessage = "x".repeat(600)
    const error = mapGardenerStatus(
      400,
      { statusMessage: longMessage, isStatusBody: true },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.message).toHaveLength(501) // 500 + "…"
    expect(error.message.endsWith("…")).toBe(true)
  })

  it("uses fixed message when Status message is empty after trim", () => {
    const error = mapGardenerStatus(400, { statusMessage: "   ", isStatusBody: true }, testOpts)
    expect(error.message).toBe("The Kubernetes service rejected the request.")
  })

  it("includes [redacted] when token is part of a larger message", () => {
    const error = mapGardenerStatus(
      400,
      { statusMessage: "Failed with token tok-123 in request", isStatusBody: true },
      testOpts
    )
    expect(error.message).toContain("[redacted]")
    expect(error.message).not.toContain("tok-123")
  })

  it("never passes through Elektra envelope text", () => {
    const error = mapGardenerStatus(
      400,
      { rawMessage: "API Error", isStatusBody: false },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.message).toBe("The Kubernetes service rejected the request.")
    expect(error.message).not.toContain("API Error")
  })

  it("maps 401 to UNAUTHORIZED when session is invalid", () => {
    const error = mapGardenerStatus(
      401,
      { rawMessage: "Unauthorized", isStatusBody: false },
      { sessionValid: false, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.code).toBe("UNAUTHORIZED")
    expect(error.message).toBe("Your session is no longer valid.")
  })

  it("maps 401 to BAD_GATEWAY when session is still valid", () => {
    const error = mapGardenerStatus(
      401,
      { rawMessage: "Unauthorized", isStatusBody: false },
      { sessionValid: true, secrets: [], operation: "test", landscape: "qa" }
    )
    expect(error.code).toBe("BAD_GATEWAY")
    expect(error.message).toBe("The Kubernetes service did not accept the session credentials.")
  })

  it("logs the redacted message", () => {
    mapGardenerStatus(400, { statusMessage: "Contains tok-123", rawMessage: "fallback", isStatusBody: true }, testOpts)
    expect(consoleErrorSpy).toHaveBeenCalledWith("[kubernetes] test failed", {
      landscape: "qa",
      status: 400,
      message: "Contains [redacted]",
    })
  })

  it("logs rawMessage when statusMessage is absent", () => {
    mapGardenerStatus(
      502,
      { rawMessage: "<html>bad gateway Bearer qa-de-1:tok-123</html>", isStatusBody: false },
      testOpts
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[kubernetes] test failed",
      expect.objectContaining({
        message: expect.stringContaining("[redacted]"),
      })
    )
    const loggedMessage = consoleErrorSpy.mock.calls[0][1].message
    expect(loggedMessage).not.toContain("tok-123")
    expect(loggedMessage).not.toContain("qa-de-1:tok-123")
  })
})

describe("detectErrorBody", () => {
  it("detects a Status Failure with isStatusBody: true", () => {
    expect(detectErrorBody({ kind: "Status", status: "Failure", code: 403, message: "forbidden" })).toEqual({
      status: 403,
      message: "forbidden",
      isStatusBody: true,
    })
  })

  it("defaults a Status Failure without code to 500", () => {
    expect(detectErrorBody({ kind: "Status", status: "Failure" })).toEqual({
      status: 500,
      message: undefined,
      isStatusBody: true,
    })
  })

  it("ignores a Status Success", () => {
    expect(detectErrorBody({ kind: "Status", status: "Success" })).toBeNull()
  })

  it("detects the Elektra envelope with isStatusBody: false", () => {
    expect(detectErrorBody({ error: "API Error", code: 404, message: "x" })).toEqual({
      status: 404,
      message: "x",
      isStatusBody: false,
    })
  })

  it.each([{ data: {} }, [], null, "text"])("returns null for %j", (body) => {
    expect(detectErrorBody(body)).toBeNull()
  })
})

describe("mapGardenerError", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock spy type
  let consoleErrorSpy: any

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it("maps a rejected API error by status with Status body", () => {
    const error = new SignalOpenstackApiError("denied", 403, {
      kind: "Status",
      status: "Failure",
      code: 403,
      message: "forbidden",
    })
    const result = mapGardenerError(error, ctx(true), idle(), testOpts)
    expect(result.code).toBe("FORBIDDEN")
    expect(result.message).toBe("The Kubernetes service refused the request (missing permission or exceeded quota).")
    expect(result.cause).toBeUndefined()
  })

  it("passes the session validity to the 401 mapping", () => {
    const error = new SignalOpenstackApiError("Unauthorized", 401)
    expect(mapGardenerError(error, ctx(true), idle(), testOpts).code).toBe("BAD_GATEWAY")
    expect(mapGardenerError(error, ctx(false), idle(), testOpts).code).toBe("UNAUTHORIZED")
  })

  it("maps a timeout to GATEWAY_TIMEOUT whatever the error class", () => {
    const error = new SignalOpenstackApiError("The operation was aborted due to timeout", 500)
    expect(mapGardenerError(error, ctx(true), AbortSignal.abort(), testOpts).code).toBe("GATEWAY_TIMEOUT")
  })

  it("keeps a 500 as INTERNAL_SERVER_ERROR when the timeout did not fire", () => {
    const error = new SignalOpenstackApiError("The operation was aborted due to timeout", 500)
    expect(mapGardenerError(error, ctx(true), idle(), testOpts).code).toBe("INTERNAL_SERVER_ERROR")
  })

  it("maps a client cancel to CLIENT_CLOSED_REQUEST", () => {
    const result = mapGardenerError(new SignalOpenstackError("Request canceled"), ctx(true), idle(), testOpts)
    expect(result.code).toBe("CLIENT_CLOSED_REQUEST")
  })

  it("returns unknown errors as INTERNAL_SERVER_ERROR with fixed message", () => {
    const error = new Error("other")
    const result = mapGardenerError(error, ctx(true), idle(), testOpts)
    expect(result.code).toBe("INTERNAL_SERVER_ERROR")
    expect(result.message).toBe("The Kubernetes service request failed.")
  })

  it("logs unknown errors redacted", () => {
    const error = new Error("Contains tok-123")
    mapGardenerError(error, ctx(true), idle(), testOpts)
    expect(consoleErrorSpy).toHaveBeenCalledWith("[kubernetes] test failed with unknown error", {
      landscape: "qa",
      message: "Contains [redacted]",
    })
  })

  it("never includes token in any error message", () => {
    const testCases = [
      new SignalOpenstackApiError("Contains tok-123", 400, {
        kind: "Status",
        status: "Failure",
        code: 400,
        message: "tok-123",
      }),
      new SignalOpenstackApiError("qa-de-1:tok-123", 422, {
        kind: "Status",
        status: "Failure",
        code: 422,
        message: "qa-de-1:tok-123",
      }),
      new Error("Bearer tok-123"),
    ]

    for (const error of testCases) {
      const result = mapGardenerError(error, ctx(true), idle(), testOpts)
      expect(result.message).not.toContain("tok-123")
      expect(result.message).not.toContain("qa-de-1:tok-123")
    }
  })

  it("never logs token in console.error", () => {
    const error = new SignalOpenstackApiError("Contains tok-123", 400, {
      kind: "Status",
      status: "Failure",
      code: 400,
      message: "tok-123",
    })
    mapGardenerError(error, ctx(true), idle(), testOpts)

    for (const call of consoleErrorSpy.mock.calls) {
      const allArgs = JSON.stringify(call)
      expect(allArgs).not.toContain("tok-123")
      expect(allArgs).not.toContain("qa-de-1:tok-123")
    }
  })
})
