import { describe, it, expect, beforeEach, afterEach } from "vitest"
import Fastify, { FastifyInstance } from "fastify"
import FastifyCookie from "@fastify/cookie"
import csrfPlugin, { type CsrfPluginOptions } from "./csrfProtection"

describe("CSRF Protection Plugin", () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify({ logger: false }) // Disable logging for cleaner test output
    // Register cookie plugin first (required for CSRF)
    await app.register(FastifyCookie, {
      secret: "test-secret", // Use a test secret for cookie signing
    })
  })

  afterEach(async () => {
    await app.close()
  })

  describe("Plugin Registration", () => {
    it("should register plugin with default options", async () => {
      await app.register(csrfPlugin)
      await app.ready()

      expect(
        app.hasRoute({
          method: "GET",
          url: "/csrf-token",
        })
      ).toBe(true)
    })

    it("should register plugin with custom options", async () => {
      const options: CsrfPluginOptions = {
        tokenRoute: "/api/csrf-token",
        cookieKey: "custom-csrf-cookie",
        tokenHeader: "custom-csrf-header",
        excludePaths: ["/public", "/health"],
        protectionMethods: ["POST", "PUT", "DELETE", "PATCH"],
      }

      await app.register(csrfPlugin, options)
      await app.ready()

      expect(
        app.hasRoute({
          method: "GET",
          url: "/api/csrf-token",
        })
      ).toBe(true)
    })

    it("should register multiple instances with different configurations", async () => {
      // This tests the fastify-plugin behavior
      const app1 = Fastify({ logger: false })
      const app2 = Fastify({ logger: false })

      await app1.register(FastifyCookie, { secret: "secret1" })
      await app2.register(FastifyCookie, { secret: "secret2" })

      await app1.register(csrfPlugin, { tokenRoute: "/csrf1" })
      await app2.register(csrfPlugin, { tokenRoute: "/csrf2" })

      await app1.ready()
      await app2.ready()

      expect(app1.hasRoute({ method: "GET", url: "/csrf1" })).toBe(true)
      expect(app2.hasRoute({ method: "GET", url: "/csrf2" })).toBe(true)

      await app1.close()
      await app2.close()
    })
  })

  describe("CSRF Token Endpoint", () => {
    beforeEach(async () => {
      await app.register(csrfPlugin)
      await app.ready()
    })

    it("should return CSRF token on GET /csrf-token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/csrf-token",
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("csrfToken")
      expect(typeof body.csrfToken).toBe("string")
      expect(body.csrfToken.length).toBeGreaterThan(0)
    })

    it("should return different tokens on subsequent requests", async () => {
      const response1 = await app.inject({
        method: "GET",
        url: "/csrf-token",
      })

      const response2 = await app.inject({
        method: "GET",
        url: "/csrf-token",
      })

      const body1 = JSON.parse(response1.body)
      const body2 = JSON.parse(response2.body)

      expect(body1.csrfToken).not.toBe(body2.csrfToken)
    })

    it("should use custom token route when configured", async () => {
      const customApp = Fastify({ logger: false })
      await customApp.register(FastifyCookie, { secret: "test-secret" })
      await customApp.register(csrfPlugin, { tokenRoute: "/api/token" })
      await customApp.ready()

      const response = await customApp.inject({
        method: "GET",
        url: "/api/token",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty("csrfToken")

      await customApp.close()
    })

    it("should validate response schema", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/csrf-token",
      })

      expect(response.statusCode).toBe(200)

      const body = JSON.parse(response.body)

      // Validate response structure matches schema
      expect(typeof body).toBe("object")
      expect(body).toHaveProperty("csrfToken")
      expect(typeof body.csrfToken).toBe("string")
      expect(body.csrfToken.length).toBeGreaterThan(0)

      // Should only have the expected property
      expect(Object.keys(body)).toEqual(["csrfToken"])
    })
  })

  describe("CSRF Protection", () => {
    let csrfToken: string
    let cookies: string

    beforeEach(async () => {
      await app.register(csrfPlugin, { cookieKey: "custom-csrf-cookie" })

      // Add test routes BEFORE calling ready()
      app.post("/test-protected", async () => {
        return { success: true }
      })

      app.get("/test-get", async () => {
        return { success: true }
      })

      app.put("/test-put", async () => {
        return { success: true }
      })

      app.delete("/test-delete", async () => {
        return { success: true }
      })
      app.options("/test-options", async () => ({ success: true }))
      app.head("/test-head", async () => ({ success: true }))

      await app.ready()

      // Get a CSRF token for testing
      const tokenResponse = await app.inject({
        method: "GET",
        url: "/csrf-token",
      })

      const tokenBody = JSON.parse(tokenResponse.body)
      csrfToken = tokenBody.csrfToken
      cookies = tokenResponse.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")
    })

    it("should allow POST request with valid CSRF token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/test-protected",
        headers: {
          "x-csrf-token": csrfToken,
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })

    it("should reject POST request without CSRF token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/test-protected",
        headers: {
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(response.statusCode).toBe(403)
    })

    it("should reject POST request with invalid CSRF token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/test-protected",
        headers: {
          "x-csrf-token": "invalid-token",
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(response.statusCode).toBe(403)
    })

    it("should reject POST request with empty CSRF token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/test-protected",
        headers: {
          "x-csrf-token": "",
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(response.statusCode).toBe(403)
    })

    it("should allow GET request without CSRF token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/test-get",
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.success).toBe(true)
    })

    it("should protect PUT and DELETE requests", async () => {
      // Test PUT without token
      const putResponse = await app.inject({
        method: "PUT",
        url: "/test-put",
        headers: { "content-type": "application/json", cookie: cookies },
        body: JSON.stringify({ test: "data" }),
      })
      expect(putResponse.statusCode).toBe(403)

      // Test DELETE without token
      const deleteResponse = await app.inject({
        method: "DELETE",
        url: "/test-delete",
      })
      expect(deleteResponse.statusCode).toBe(403)

      // Test PUT with valid token
      const putValidResponse = await app.inject({
        method: "PUT",
        url: "/test-put",
        headers: {
          "x-csrf-token": csrfToken,
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })
      expect(putValidResponse.statusCode).toBe(200)

      // Test DELETE with valid token
      const deleteValidResponse = await app.inject({
        method: "DELETE",
        url: "/test-delete",
        headers: {
          "x-csrf-token": csrfToken,
          cookie: cookies,
        },
      })
      expect(deleteValidResponse.statusCode).toBe(200)
    })

    it("should handle PATCH requests when included in protection methods", async () => {
      const customApp = Fastify({ logger: false })
      await customApp.register(FastifyCookie, { secret: "test-secret" })
      await customApp.register(csrfPlugin, {
        protectionMethods: ["POST", "PUT", "DELETE", "PATCH"],
      })

      customApp.patch("/test-patch", async () => ({ success: true }))
      await customApp.ready()

      // Get token
      const tokenResponse = await customApp.inject({
        method: "GET",
        url: "/csrf-token",
      })
      const { csrfToken: patchToken } = JSON.parse(tokenResponse.body)
      const cookies = tokenResponse.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")

      // Test PATCH without token
      const patchResponseFail = await customApp.inject({
        method: "PATCH",
        url: "/test-patch",
        headers: { "content-type": "application/json", cookie: cookies },
        body: JSON.stringify({ test: "data" }),
      })
      expect(patchResponseFail.statusCode).toBe(403)

      // Test PATCH with valid token
      const patchResponseSuccess = await customApp.inject({
        method: "PATCH",
        url: "/test-patch",
        headers: {
          "x-csrf-token": patchToken,
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })
      expect(patchResponseSuccess.statusCode).toBe(200)

      await customApp.close()
    })

    it("should not protect OPTIONS or HEAD requests", async () => {
      const optionsResponse = await app.inject({
        method: "OPTIONS",
        url: "/test-options",
      })
      expect(optionsResponse.statusCode).toBe(200)

      const headResponse = await app.inject({
        method: "HEAD",
        url: "/test-head",
      })
      expect(headResponse.statusCode).toBe(200)
    })
  })

  describe("Exclude Paths", () => {
    beforeEach(async () => {
      await app.register(csrfPlugin, {
        excludePaths: ["/extensions", "/public"],
      })

      // Add test routes BEFORE ready()
      app.post("/extensions/test", async () => {
        return { success: true }
      })

      app.post("/public/test", async () => {
        return { success: true }
      })

      app.post("/protected/test", async () => {
        return { success: true }
      })

      await app.ready()
    })

    it("should allow POST to excluded paths without CSRF token", async () => {
      const extensionsResponse = await app.inject({
        method: "POST",
        url: "/extensions/test",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })

      const publicResponse = await app.inject({
        method: "POST",
        url: "/public/test",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })

      expect(extensionsResponse.statusCode).toBe(200)
      expect(publicResponse.statusCode).toBe(200)
    })

    it("should still protect non-excluded paths", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/protected/test",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })

      expect(response.statusCode).toBe(403)
    })

    it("should work with nested excluded paths", async () => {
      const nestedApp = Fastify({ logger: false })
      await nestedApp.register(FastifyCookie, { secret: "test-secret" })
      await nestedApp.register(csrfPlugin, {
        excludePaths: ["/api/public", "/webhooks"],
      })

      nestedApp.post("/api/public/users", async () => ({ success: true }))
      nestedApp.post("/api/public/data/export", async () => ({ success: true }))
      nestedApp.post("/webhooks/github", async () => ({ success: true }))
      nestedApp.post("/api/private/users", async () => ({ success: true }))

      await nestedApp.ready()

      // Test nested public paths (should be excluded)
      const publicResponse1 = await nestedApp.inject({
        method: "POST",
        url: "/api/public/users",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })

      expect(publicResponse1.statusCode).toBe(200)

      const publicResponse2 = await nestedApp.inject({
        method: "POST",
        url: "/api/public/data/export",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })
      expect(publicResponse2.statusCode).toBe(200)

      // Test webhook path (should be excluded)
      const webhookResponse = await nestedApp.inject({
        method: "POST",
        url: "/webhooks/github",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })
      expect(webhookResponse.statusCode).toBe(200)

      // Test private path (should be protected)
      const privateResponse = await nestedApp.inject({
        method: "POST",
        url: "/api/private/users",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })
      expect(privateResponse.statusCode).toBe(403)

      await nestedApp.close()
    })
  })

  describe("Custom Configuration", () => {
    it("should use custom header name", async () => {
      const customApp = Fastify({ logger: false })
      await customApp.register(FastifyCookie, { secret: "test-secret" })
      await customApp.register(csrfPlugin, {
        tokenHeader: "custom-csrf-header",
      })

      customApp.post("/test", async () => {
        return { success: true }
      })

      await customApp.ready()

      // Get token
      const tokenResponse = await customApp.inject({
        method: "GET",
        url: "/csrf-token",
      })
      const { csrfToken } = JSON.parse(tokenResponse.body)
      const cookies = tokenResponse.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")

      // Test with custom header
      const response = await customApp.inject({
        method: "POST",
        url: "/test",
        headers: {
          "custom-csrf-header": csrfToken,
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(response.statusCode).toBe(200)

      // Test with default header (should fail)
      const failResponse = await customApp.inject({
        method: "POST",
        url: "/test",
        headers: {
          "some-x-csrf-token": csrfToken,
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(failResponse.statusCode).toBe(403)

      await customApp.close()
    })

    it("should use custom protection methods", async () => {
      const customApp = Fastify({ logger: false })
      await customApp.register(FastifyCookie, { secret: "test-secret" })
      await customApp.register(csrfPlugin, {
        protectionMethods: ["POST", "PATCH"],
      })

      customApp.post("/test-post", async () => ({ success: true }))
      customApp.put("/test-put", async () => ({ success: true }))
      customApp.patch("/test-patch", async () => ({ success: true }))
      customApp.delete("/test-delete", async () => ({ success: true }))

      await customApp.ready()

      // POST should be protected
      const postResponse = await customApp.inject({
        method: "POST",
        url: "/test-post",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })
      expect(postResponse.statusCode).toBe(403)

      // PUT should NOT be protected (not in custom methods)
      const putResponse = await customApp.inject({
        method: "PUT",
        url: "/test-put",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })
      expect(putResponse.statusCode).toBe(200)

      // PATCH should be protected
      const patchResponse = await customApp.inject({
        method: "PATCH",
        url: "/test-patch",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })
      expect(patchResponse.statusCode).toBe(403)

      // DELETE should NOT be protected (not in custom methods)
      const deleteResponse = await customApp.inject({
        method: "DELETE",
        url: "/test-delete",
      })
      expect(deleteResponse.statusCode).toBe(200)

      await customApp.close()
    })

    it("should use custom cookie key", async () => {
      const customApp = Fastify({ logger: false })
      await customApp.register(FastifyCookie, { secret: "test-secret" })
      await customApp.register(csrfPlugin, {
        cookieKey: "my-custom-csrf-cookie",
      })

      customApp.post("/test", async () => ({ success: true }))
      await customApp.ready()

      // Get token (this should work with custom cookie key)
      const tokenResponse = await customApp.inject({
        method: "GET",
        url: "/csrf-token",
      })
      expect(tokenResponse.statusCode).toBe(200)

      const { csrfToken } = JSON.parse(tokenResponse.body)
      const cookies = tokenResponse.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")

      // Use the token (should work)
      const protectedResponse = await customApp.inject({
        method: "POST",
        url: "/test",
        headers: {
          "x-csrf-token": csrfToken,
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(protectedResponse.statusCode).toBe(200)

      await customApp.close()
    })

    it("should handle case-insensitive headers", async () => {
      const customApp = Fastify({ logger: false })
      await customApp.register(FastifyCookie, { secret: "test-secret" })
      await customApp.register(csrfPlugin, {
        tokenHeader: "X-CSRF-Token", // Mixed case
      })

      customApp.post("/test", async () => ({ success: true }))
      await customApp.ready()

      const tokenResponse = await customApp.inject({
        method: "GET",
        url: "/csrf-token",
      })
      const { csrfToken } = JSON.parse(tokenResponse.body)
      const cookies = tokenResponse.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")

      // Test with different case variations
      const response1 = await customApp.inject({
        method: "POST",
        url: "/test",
        headers: {
          "x-csrf-token": csrfToken, // lowercase
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })
      expect(response1.statusCode).toBe(200)

      const response2 = await customApp.inject({
        method: "POST",
        url: "/test",
        headers: {
          "X-CSRF-Token": csrfToken, // exact case
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })
      expect(response2.statusCode).toBe(200)

      await customApp.close()
    })
  })

  describe("Edge Cases and Error Handling", () => {
    beforeEach(async () => {
      await app.register(csrfPlugin)
      app.post("/test", async () => ({ success: true }))
      await app.ready()
    })

    it("should handle malformed CSRF token gracefully", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/test",
        headers: {
          "x-csrf-token": "malformed-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(response.statusCode).toBe(403)
    })

    it("should handle array header values correctly", async () => {
      // Get valid token first
      const tokenResponse = await app.inject({
        method: "GET",
        url: "/csrf-token",
      })
      const { csrfToken } = JSON.parse(tokenResponse.body)
      const cookies = tokenResponse.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ")

      // Test with valid token (the getToken function handles arrays)
      const response = await app.inject({
        method: "POST",
        url: "/test",
        headers: {
          "x-csrf-token": csrfToken,
          "content-type": "application/json",
          cookie: cookies,
        },
        body: JSON.stringify({ test: "data" }),
      })

      expect(response.statusCode).toBe(200)
    })

    it("should handle special characters in URLs", async () => {
      const app = Fastify({ logger: false })
      await app.register(FastifyCookie, { secret: "test" })
      await app.register(csrfPlugin)
      await app.post("/test%20with%20spaces", async () => ({ success: true }))
      await app.post("/test-with-special-chars!@#", async () => ({ success: true }))

      const response1 = await app.inject({
        method: "POST",
        url: "/test%20with%20spaces",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })
      expect(response1.statusCode).toBe(403)

      const response2 = await app.inject({
        method: "POST",
        url: "/test-with-special-chars!@#",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ test: "data" }),
      })
      expect(response2.statusCode).toBe(403)
    })
  })
})
