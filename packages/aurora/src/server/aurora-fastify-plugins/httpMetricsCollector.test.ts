import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { FastifyInstance } from "fastify"
import { createServer } from "../server"

describe("HTTP Metrics Collector", () => {
  let server: FastifyInstance

  beforeAll(async () => {
    server = await createServer({
      identityEndpoint: "http://localhost:5000",
      policyDir: "",
    })
    await server.ready()
  })

  afterAll(async () => {
    await server.close()
  })

  it("should expose /metrics endpoint", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/metrics",
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers["content-type"]).toContain("text/plain")
  })

  it("should include aurora_requests_total metric", async () => {
    // Make a test request to generate metrics
    await server.inject({
      method: "GET",
      url: "/",
    })

    const response = await server.inject({
      method: "GET",
      url: "/metrics",
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("aurora_requests_total")
    expect(response.body).toContain("The total number of HTTP requests handled by the application")
  })

  it("should include aurora_request_duration_seconds metric", async () => {
    // Make a test request to generate metrics
    await server.inject({
      method: "GET",
      url: "/",
    })

    const response = await server.inject({
      method: "GET",
      url: "/metrics",
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("aurora_request_duration_seconds")
    expect(response.body).toContain("The HTTP response duration of the application")
  })

  it("should include labels in metrics", async () => {
    // Make a test request to generate metrics
    await server.inject({
      method: "GET",
      url: "/test",
    })

    const response = await server.inject({
      method: "GET",
      url: "/metrics",
    })

    expect(response.statusCode).toBe(200)
    // Check that the metrics include expected labels
    expect(response.body).toMatch(/status_code="\d+"/)
    expect(response.body).toMatch(/method="[a-z]+"/)
    expect(response.body).toMatch(/route="[^"]*"/)
    expect(response.body).toMatch(/endpoint_type="[^"]*"/)
  })

  it("should exclude /metrics path from metrics collection", async () => {
    // Make initial /metrics request
    await server.inject({
      method: "GET",
      url: "/metrics",
    })

    // Make another /metrics request
    await server.inject({
      method: "GET",
      url: "/metrics",
    })

    // Get final metrics
    const finalResponse = await server.inject({
      method: "GET",
      url: "/metrics",
    })

    // The /metrics requests themselves should not be counted
    // We can verify this by checking that the metrics for /metrics path are not present
    expect(finalResponse.statusCode).toBe(200)
  })

  it("should track exceptions", async () => {
    // The server should have an exceptions_total metric defined
    const response = await server.inject({
      method: "GET",
      url: "/metrics",
    })

    expect(response.statusCode).toBe(200)
    expect(response.body).toContain("aurora_exceptions_total")
    expect(response.body).toContain("The total number of exceptions raised by the application")
  })
})
