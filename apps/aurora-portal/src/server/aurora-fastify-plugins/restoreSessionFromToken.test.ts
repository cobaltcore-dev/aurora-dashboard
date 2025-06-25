import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import Fastify, { FastifyInstance } from "fastify"
import FastifyCookie from "@fastify/cookie"
import sessionRestorationPlugin, { type SessionRestorationPluginOptions } from "./restoreSessionFromToken"

// Mock the SessionCookie module
vi.mock("../sessionCookie", () => ({
  SessionCookie: vi.fn(() => ({
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  })),
}))

// Import the mocked module for type checking
import { SessionCookie } from "../sessionCookie"

describe("Session Restoration Plugin", () => {
  let app: FastifyInstance
  let mockSessionCookie: {
    set: ReturnType<typeof vi.fn>
    get: ReturnType<typeof vi.fn>
    del: ReturnType<typeof vi.fn>
  }

  beforeEach(async () => {
    app = Fastify({ logger: false })

    // Register cookie plugin
    await app.register(FastifyCookie, {
      secret: "test-secret-session-restoration-32-chars",
    })

    // Reset mocks
    vi.clearAllMocks()

    // Setup mock to return the mock object
    mockSessionCookie = {
      set: vi.fn(),
      get: vi.fn(),
      del: vi.fn(),
    }

    vi.mocked(SessionCookie).mockReturnValue(mockSessionCookie)
  })

  afterEach(async () => {
    await app.close()
  })

  describe("Plugin Registration", () => {
    it("should register plugin with default route", async () => {
      await app.register(sessionRestorationPlugin)
      await app.ready()

      expect(
        app.hasRoute({
          method: "POST",
          url: "/restore-session",
        })
      ).toBe(true)
    })

    it("should register plugin with custom route", async () => {
      const options: SessionRestorationPluginOptions = {
        route: "/api/session/restore",
      }

      await app.register(sessionRestorationPlugin, options)
      await app.ready()

      expect(
        app.hasRoute({
          method: "POST",
          url: "/api/session/restore",
        })
      ).toBe(true)
    })

    it("should work with prefix registration", async () => {
      await app.register(sessionRestorationPlugin, { prefix: "/auth" })
      await app.ready()

      expect(
        app.hasRoute({
          method: "POST",
          url: "/auth/restore-session",
        })
      ).toBe(true)
    })

    it("should register multiple instances with different routes", async () => {
      await app.register(sessionRestorationPlugin, { route: "/restore1" })
      await app.register(sessionRestorationPlugin, { route: "/restore2" })
      await app.ready()

      expect(app.hasRoute({ method: "POST", url: "/restore1" })).toBe(true)
      expect(app.hasRoute({ method: "POST", url: "/restore2" })).toBe(true)
    })
  })

  describe("Session Restoration", () => {
    beforeEach(async () => {
      await app.register(sessionRestorationPlugin)
      await app.ready()
    })

    it("should restore session with valid authToken", async () => {
      const authToken = "valid-auth-token-12345"

      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken,
        }),
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe("/")

      // Verify SessionCookie was called correctly
      expect(SessionCookie).toHaveBeenCalledWith({
        req: expect.any(Object),
        res: expect.any(Object),
      })
      expect(mockSessionCookie.set).toHaveBeenCalledWith(authToken)
    })

    it("should restore session with custom redirectUrl", async () => {
      const authToken = "valid-auth-token-12345"
      const redirectUrl = "/dashboard"

      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken,
          redirectUrl,
        }),
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(redirectUrl)
      expect(mockSessionCookie.set).toHaveBeenCalledWith(authToken)
    })

    it("should handle complex redirectUrl paths", async () => {
      const testCases = [
        { redirectUrl: "/dashboard/profile", expected: "/dashboard/profile" },
        { redirectUrl: "/app?tab=settings", expected: "/app?tab=settings" },
        {
          redirectUrl: "/nested/path/with/params?id=123&view=edit",
          expected: "/nested/path/with/params?id=123&view=edit",
        },
        { redirectUrl: "/", expected: "/" },
        { redirectUrl: "/simple", expected: "/simple" },
      ]

      for (const testCase of testCases) {
        vi.clearAllMocks()

        const response = await app.inject({
          method: "POST",
          url: "/restore-session",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            authToken: "test-token",
            redirectUrl: testCase.redirectUrl,
          }),
        })

        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(testCase.expected)
      }
    })

    it("should use default redirectUrl when not provided", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: "test-token",
        }),
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe("/")
    })

    it("should handle different token formats", async () => {
      const tokenFormats = [
        "simple-token",
        "JWT.token.with.dots",
        "base64-encoded-token-abc123XYZ==",
        "uuid-like-token-550e8400-e29b-41d4-a716-446655440000",
        "very-long-token-" + "x".repeat(100),
      ]

      for (const token of tokenFormats) {
        vi.clearAllMocks()

        const response = await app.inject({
          method: "POST",
          url: "/restore-session",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            authToken: token,
          }),
        })

        expect(response.statusCode).toBe(302)
        expect(mockSessionCookie.set).toHaveBeenCalledWith(token)
      }
    })
  })

  describe("Request Validation", () => {
    beforeEach(async () => {
      await app.register(sessionRestorationPlugin)
      await app.ready()
    })

    it("should reject request without authToken", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}),
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("error")
      expect(mockSessionCookie.set).not.toHaveBeenCalled()
    })

    it("should reject request with empty authToken", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: "",
        }),
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("error")
      expect(mockSessionCookie.set).not.toHaveBeenCalled()
    })

    it("should reject request with null authToken", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: null,
        }),
      })

      expect(response.statusCode).toBe(400)
      expect(mockSessionCookie.set).not.toHaveBeenCalled()
    })
  })

  describe("Custom Route Configuration", () => {
    it("should work with custom route path", async () => {
      const customApp = Fastify({ logger: false })
      await customApp.register(FastifyCookie, { secret: "test-secret-32-chars-minimum" })
      await customApp.register(sessionRestorationPlugin, {
        route: "/auth/session/restore",
      })
      await customApp.ready()

      const response = await customApp.inject({
        method: "POST",
        url: "/auth/session/restore",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: "test-token",
        }),
      })

      expect(response.statusCode).toBe(302)
      await customApp.close()
    })

    it("should work with nested paths", async () => {
      const customApp = Fastify({ logger: false })
      await customApp.register(FastifyCookie, { secret: "test-secret-32-chars-minimum" })
      await customApp.register(sessionRestorationPlugin, {
        route: "/api/v1/auth/session/restore",
      })
      await customApp.ready()

      const response = await customApp.inject({
        method: "POST",
        url: "/api/v1/auth/session/restore",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: "test-token",
        }),
      })

      expect(response.statusCode).toBe(302)
      await customApp.close()
    })
  })

  describe("SessionCookie Integration", () => {
    beforeEach(async () => {
      await app.register(sessionRestorationPlugin)
      await app.ready()
    })

    it("should pass correct parameters to SessionCookie", async () => {
      await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: "test-token",
        }),
      })

      expect(SessionCookie).toHaveBeenCalledWith({
        req: expect.objectContaining({
          method: "POST",
          url: "/restore-session",
        }),
        res: expect.objectContaining({
          redirect: expect.any(Function),
        }),
      })
    })

    it("should handle SessionCookie errors gracefully", async () => {
      // Mock SessionCookie to throw an error
      mockSessionCookie.set.mockImplementation(() => {
        throw new Error("SessionCookie error")
      })

      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: "test-token",
        }),
      })

      // Should return 500 for internal errors
      expect(response.statusCode).toBe(500)
    })
  })

  describe("Edge Cases", () => {
    beforeEach(async () => {
      await app.register(sessionRestorationPlugin)
      await app.ready()
    })

    it("should handle very long authTokens", async () => {
      const longToken = "a".repeat(10000)

      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: longToken,
        }),
      })

      expect(response.statusCode).toBe(302)
      expect(mockSessionCookie.set).toHaveBeenCalledWith(longToken)
    })

    it("should handle special characters in redirectUrl", async () => {
      const specialUrls = [
        "/path with spaces",
        "/path?query=value&other=123",
        "/path#fragment",
        "/path?query=value with spaces&other=special!@#$%",
        "/üñíçødé/path", // Unicode characters
      ]

      for (const url of specialUrls) {
        vi.clearAllMocks()

        const response = await app.inject({
          method: "POST",
          url: "/restore-session",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            authToken: "test-token",
            redirectUrl: url,
          }),
        })

        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe(url)
      }
    })

    it("should handle empty body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: "",
      })

      expect(response.statusCode).toBe(400)
    })

    it("should handle very large request bodies", async () => {
      const largeToken = "token-" + "x".repeat(100000)

      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: largeToken,
        }),
      })

      // Should handle large requests (assuming no size limits configured)
      expect([200, 302, 413]).toContain(response.statusCode) // 413 = Payload Too Large
    })
  })

  describe("Response Format", () => {
    beforeEach(async () => {
      await app.register(sessionRestorationPlugin)
      await app.ready()
    })

    it("should return 302 redirect response", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          authToken: "test-token",
          redirectUrl: "/dashboard",
        }),
      })

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe("/dashboard")
      expect(response.headers).toHaveProperty("location")
    })

    it("should validate response against schema for error cases", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/restore-session",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({}), // Missing authToken
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("error")
      expect(typeof body.error).toBe("string")
    })
  })
})
