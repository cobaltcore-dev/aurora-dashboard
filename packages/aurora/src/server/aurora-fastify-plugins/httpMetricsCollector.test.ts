import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { FastifyInstance } from "fastify"
import Fastify from "fastify"
import { Registry } from "prom-client"
import { AuroraHttpMetricsCollector } from "./httpMetricsCollector"

describe("HTTP Metrics Collector", () => {
  let server: FastifyInstance
  let metricsRegistry: Registry

  beforeAll(async () => {
    // Create a plain Fastify instance to avoid booting full server with Vite
    server = Fastify()

    // Register the HTTP metrics collector plugin
    metricsRegistry = new Registry()
    await server.register(AuroraHttpMetricsCollector, {
      prefix: "aurora",
      excludePaths: ["/metrics"],
      registry: metricsRegistry,
      bffEndpoint: "/polaris-bff",
    })

    // Add /metrics endpoint
    server.get("/metrics", async (_request, reply) => {
      reply.header("Content-Type", metricsRegistry.contentType)
      return reply.send(await metricsRegistry.metrics())
    })

    // Add a simple test route
    server.get("/", async () => {
      return { status: "ok" }
    })

    server.get("/test", async () => {
      return { status: "test" }
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
    // Get initial metrics to establish baseline
    const initialResponse = await server.inject({
      method: "GET",
      url: "/metrics",
    })

    // Parse the initial request count for /metrics route (should not exist)
    const initialMetrics = initialResponse.body
    const metricsRoutePattern = /aurora_requests_total\{[^}]*route="\/metrics"[^}]*\}\s+(\d+)/
    const initialMatch = initialMetrics.match(metricsRoutePattern)

    // Make several /metrics requests
    await server.inject({ method: "GET", url: "/metrics" })
    await server.inject({ method: "GET", url: "/metrics" })
    await server.inject({ method: "GET", url: "/metrics" })

    // Get final metrics
    const finalResponse = await server.inject({
      method: "GET",
      url: "/metrics",
    })

    const finalMetrics = finalResponse.body
    const finalMatch = finalMetrics.match(metricsRoutePattern)

    // The /metrics route should never appear in the metrics
    expect(initialMatch).toBeNull()
    expect(finalMatch).toBeNull()
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
