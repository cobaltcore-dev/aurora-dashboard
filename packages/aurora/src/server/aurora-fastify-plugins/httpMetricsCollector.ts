import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"
import fastifyPlugin from "fastify-plugin"
import { Counter, Histogram, Registry } from "prom-client"

export interface HttpMetricsCollectorOptions {
  prefix?: string
  excludePaths?: string[]
  registry?: Registry
}

interface MetricsLabels {
  status_code: string
  method: string
  route: string
  endpoint_type: string
  project_id: string
  [key: string]: string // Add index signature for prom-client compatibility
}

// Extend FastifyRequest to include our custom property
interface MetricsRequest extends FastifyRequest {
  metricsStartTime?: bigint
}

const LABEL_NAMES = ["status_code", "method", "route", "endpoint_type", "project_id"] as const

const EXCLUDE_PATHS = ["/metrics"]

async function httpMetricsCollectorPlugin(
  fastify: FastifyInstance,
  options: HttpMetricsCollectorOptions
): Promise<void> {
  const prefix = options.prefix || "aurora"
  const excludePaths = options.excludePaths || EXCLUDE_PATHS
  const registry = options.registry || new Registry()

  // Create metrics
  const requestsTotal = new Counter<string>({
    name: `${prefix}_requests_total`,
    help: "The total number of HTTP requests handled by the application",
    labelNames: LABEL_NAMES,
    registers: [registry],
  })

  const requestDurationSeconds = new Histogram<string>({
    name: `${prefix}_request_duration_seconds`,
    help: "The HTTP response duration of the application",
    labelNames: LABEL_NAMES,
    registers: [registry],
  })

  const exceptionsTotal = new Counter<string>({
    name: `${prefix}_exceptions_total`,
    help: "The total number of exceptions raised by the application",
    labelNames: ["exception"],
    registers: [registry],
  })

  // Add onRequest hook to track request start time
  fastify.addHook("onRequest", async (request: MetricsRequest) => {
    request.metricsStartTime = process.hrtime.bigint()
  })

  // Add onResponse hook to record metrics
  fastify.addHook("onResponse", async (request: MetricsRequest, reply: FastifyReply) => {
    const path = request.url.split("?")[0]

    // Skip excluded paths
    if (excludePaths.some((excludePath) => path.startsWith(excludePath))) {
      return
    }

    const endTime = process.hrtime.bigint()
    const startTime = request.metricsStartTime || 0n
    const duration = Number(endTime - startTime) / 1e9 // Convert nanoseconds to seconds

    const labels = extractLabels(request, reply)

    try {
      requestsTotal.inc(labels)
      requestDurationSeconds.observe(labels, duration)
    } catch (error) {
      fastify.log.error(`Failed to record HTTP metrics: ${error}`)
    }
  })

  // Add onError hook to track exceptions
  fastify.addHook("onError", async (_request: FastifyRequest, _reply: FastifyReply, error: Error) => {
    try {
      exceptionsTotal.inc({ exception: error.constructor.name })
    } catch (err) {
      fastify.log.error(`Failed to record exception metric: ${err}`)
    }
  })

  // Store registry on the fastify instance for access in /metrics endpoint
  fastify.decorate("metricsRegistry", registry)
}

function extractLabels(request: FastifyRequest, reply: FastifyReply): MetricsLabels {
  const urlPath = request.url.split("?")[0]

  let endpointType: string
  let route = urlPath
  let projectId = ""

  // Extract project_id from URL if present
  // Pattern: /projects/{project_id}/... or query param
  const projectMatch = urlPath.match(/\/projects\/([^/?]+)/)
  if (projectMatch) {
    projectId = projectMatch[1]
  }

  // Also check query parameters for project_id
  if (!projectId) {
    const url = new URL(request.url, "http://localhost")
    projectId = url.searchParams.get("project_id") || ""
  }

  // tRPC API endpoints - the primary focus for infrastructure monitoring
  if (urlPath.includes("/polaris-bff/")) {
    endpointType = "trpc"
    const procedurePath = urlPath.split("/polaris-bff/")[1]
    if (procedurePath) {
      // Extract service and action from tRPC procedure
      // Example: compute.listImages -> compute/listImages
      //          network.getFloatingIp -> network/getFloatingIp
      const cleanPath = procedurePath.split("?")[0]
      const parts = cleanPath.split(".")

      if (parts.length >= 2) {
        const service = parts[0] // compute, network, storage, auth, project, services
        const action = parts.slice(1).join(".") // listImages, getImage, etc.
        route = `${service}/${action}`
      } else {
        route = cleanPath
      }
    }
  }
  // Regular API endpoints
  else if (urlPath.startsWith("/api/")) {
    endpointType = "api"
    route = normalizeApiPath(urlPath)
  }
  // Vite dev server paths - exclude from metrics (dev-only noise)
  else if (urlPath.startsWith("/@")) {
    endpointType = "vite-dev"
    route = "vite-dev"
  }
  // JavaScript/CSS/JSON modules and sourcemaps
  else if (urlPath.match(/\.(js|jsx|ts|tsx|mjs|css|json|map)$/)) {
    endpointType = "module"
    const ext = urlPath.split(".").pop() || "unknown"
    route = `*.${ext}`
  }
  // Static assets (images, fonts, etc.)
  else if (urlPath.match(/\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|webp)$/)) {
    endpointType = "asset"
    const ext = urlPath.split(".").pop() || "unknown"
    route = `*.${ext}`
  }
  // Root/index
  else if (urlPath === "/" || urlPath === "/index.html") {
    endpointType = "spa"
    route = "/"
  }
  // Other SPA routes (fallback)
  else {
    endpointType = "spa"
    route = normalizeSpaRoute(urlPath)
  }

  return {
    status_code: reply.statusCode.toString(),
    method: request.method.toLowerCase(),
    route,
    endpoint_type: endpointType,
    project_id: projectId,
  }
}

/**
 * Normalize SPA routes by replacing dynamic IDs
 *
 * Examples:
 *   /projects/abc-123/compute -> /projects/:id/compute
 *   /accounts/def-456 -> /accounts/:id
 */
function normalizeSpaRoute(path: string): string {
  const segments = path.split("/").filter(Boolean)

  // Pattern: /projects/:id/service
  if (segments[0] === "projects" && segments.length >= 3) {
    const service = segments[2] // compute, network, storage, services
    return `/projects/:id/${service}`
  }

  // Pattern: /accounts/:id
  if (segments[0] === "accounts" && segments.length >= 2) {
    return "/accounts/:id"
  }

  // Generic normalization - replace IDs
  return (
    "/" +
    segments
      .map((segment) => {
        // Replace UUIDs
        if (segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return ":id"
        }
        // Replace long IDs (20+ chars)
        if (segment.match(/^[a-zA-Z0-9_-]{20,}$/)) {
          return ":id"
        }
        return segment
      })
      .join("/")
  )
}

/**
 * Normalize API paths by replacing IDs
 */
function normalizeApiPath(path: string): string {
  return path
    .split("/")
    .map((segment) => {
      if (segment.match(/^\d+$/) || segment.match(/^[0-9a-f-]{36}$/i)) {
        return ":id"
      }
      return segment
    })
    .join("/")
}

export const AuroraHttpMetricsCollector = fastifyPlugin(httpMetricsCollectorPlugin, {
  name: "aurora-http-metrics-collector",
  fastify: "5.x",
})

// Type augmentation for TypeScript
declare module "fastify" {
  interface FastifyInstance {
    metricsRegistry: Registry
  }
}
