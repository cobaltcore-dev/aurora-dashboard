import "./types"
import Fastify, { FastifyError } from "fastify"
import FastifyStatic from "@fastify/static"
import FastifyVite from "@fastify/vite"
import FastifyCookie from "@fastify/cookie"
import FastifyHelmet from "@fastify/helmet"
import FastifyRateLimit from "@fastify/rate-limit"
import FastifyMultipart, { MultipartFields, MultipartValue } from "@fastify/multipart"
import { CreateFastifyContextOptions, FastifyTRPCPluginOptions, fastifyTRPCPlugin } from "@trpc/server/adapters/fastify"
import { appRouter, AuroraRouter } from "./routers" // tRPC router
import { createContext } from "./context"
import * as dotenv from "dotenv"
import path from "path"
import { Readable } from "node:stream"
import { ZodError } from "zod"
import { AuroraFastifyCsrfProtection } from "./aurora-fastify-plugins"

// Load environment variables from .env file
dotenv.config()

// Determine environment and configuration
const isProduction = process.env.NODE_ENV === "production"
const PORT = process.env.PORT || "4005"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

// Initialize Fastify server
const server = Fastify({
  logger: true,
  bodyLimit: 1 * 1024 * 1024, // 1MB default; upload route overrides per-route
  requestTimeout: 30000, // 30 seconds default
  keepAliveTimeout: 600000, // 10 minutes keep-alive
  routerOptions: {
    maxParamLength: 5000,
  },
})

async function startServer() {
  // Register cookie middleware - required for session management and CSRF
  // TODO: Set COOKIE_SECRET env var in production (random 32+ char string, stored in secret manager)
  server.register(FastifyCookie, {
    secret: undefined,
  })

  // Global rate limit: 200 req/min per IP. Upload route gets a tighter limit via config below.
  await server.register(FastifyRateLimit, { max: 200, timeWindow: "1 minute" })

  // Register multipart/form-data support
  await server.register(FastifyMultipart, {
    limits: {
      fileSize: 5 * 1024 * 1024 * 1024, // 5GB max per file
      files: 10, // max 10 files per request
    },
  })

  // Register application/octet-stream parser that passes the raw request payload
  // stream as the body. tRPC's octetInputParser expects to receive a ReadableStream —
  // payload is the Node.js IncomingMessage / Readable piped from the HTTP body.
  // Using parseAs:"buffer" would buffer everything in memory; undefined causes a 400.
  server.addContentTypeParser(
    "application/octet-stream",
    { bodyLimit: 5 * 1024 * 1024 * 1024 },
    (_req, payload, done) => {
      done(null, payload)
    }
  )

  // OPTIONAL: Direct HTTP endpoint for image file uploads (without tRPC)
  // Use this if you need a fallback or alternative upload method
  server.post(
    `${BFF_ENDPOINT}/upload-image-direct`,
    { config: { rawBody: false, rateLimit: { max: 10, timeWindow: "1 minute" } }, bodyLimit: 5 * 1024 * 1024 * 1024 },
    async (request, reply) => {
      try {
        // Reuse tRPC context for authentication check
        const ctx = await createContext({ req: request, res: reply } as CreateFastifyContextOptions)

        if (!ctx.validateSession()) {
          return reply.code(401).send({ message: "Unauthorized" })
        }

        // Parse multipart form data with file size limit
        const data = await request.file({
          limits: {
            fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
          },
        })

        if (!data) {
          return reply.code(400).send({ message: "No file" })
        }

        // Extract additional fields from request
        const fields: MultipartFields = data.fields
        const imageId = (fields.imageId as MultipartValue)?.value

        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!imageId || typeof imageId !== "string" || !UUID_RE.test(imageId)) {
          return reply.code(400).send({ message: "Invalid imageId — must be a UUID" })
        }

        // Upload to Glance
        const glance = ctx.openstack?.service("glance")

        if (!glance) {
          return reply.code(500).send({ message: "Glance service unavailable" })
        }

        const webStream = Readable.toWeb(data.file)

        await glance.put(
          `v2/images/${imageId}/file`,
          webStream, // ← Stream the file directly to Glance
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/octet-stream",
            },
          }
        )

        return reply.send({ success: true, imageId })
      } catch (error) {
        request.log.error(error)

        const { code, message } = error as FastifyError

        // Handle file size limit specifically
        if (code === "FST_REQ_FILE_TOO_LARGE") {
          return reply.code(413).send({ message: "File too large", maxSize: "5GB" })
        }

        return reply.code(500).send({ message })
      }
    }
  )

  server.register(AuroraFastifyCsrfProtection, {
    tokenRoute: "/csrf-token", // Route to get CSRF token
    cookieKey: "aurora-csrf-protection", // Cookie name for CSRF
    tokenHeader: "x-csrf-token", // Header name for CSRF token
    excludePaths: ["/extensions"], // Paths to exclude from CSRF protection
    protectionMethods: ["POST", "PUT", "DELETE"], // HTTP methods that require CSRF protection
  })

  // Register tRPC plugin to handle API routes
  await server.register(fastifyTRPCPlugin, {
    prefix: BFF_ENDPOINT, // All tRPC routes will be under this prefix
    trpcOptions: {
      router: appRouter,
      createContext,
      onError: (err) => {
        // Format Zod validation errors for better client-side handling
        if (err.error.cause instanceof ZodError)
          err.error.message = err.error.cause.issues.map((e: { message: string }) => e.message).join(",")
      },
    } satisfies FastifyTRPCPluginOptions<AuroraRouter>["trpcOptions"],
  })

  // Environment-specific setup
  // Do not use vite plugin in production
  // Register security headers for all environments; CSP disabled in dev to allow Vite HMR
  server.register(FastifyHelmet, {
    contentSecurityPolicy: isProduction ? undefined : false,
  })

  if (isProduction) {
    // PRODUCTION MODE

    // Serve static files from the build directory
    await server.register(FastifyStatic, {
      root: path.join(__dirname, "../../dist/client"),
      wildcard: false, // Prevent wildcard conflicts with API routes
      serve: true,
    })

    // SPA fallback - serve index.html for all unmatched routes
    // This enables client-side routing (React Router, etc.)
    server.get("/*", (req, reply) => {
      return reply.sendFile("index.html")
    })
  } else {
    // DEVELOPMENT MODE
    // use FastifyVite for development with HMR support

    // Register Vite plugin for development with HMR support
    await server.register(FastifyVite, {
      root: path.resolve(__dirname, "../../"), // Location of vite.config.js
      dev: true, // Enable dev mode
      spa: true, // SPA mode (no SSR),
    })

    // Wait for Vite to be ready before registering routes
    // This ensures Vite middleware is initialized
    await server.vite.ready()

    // SPA fallback for development
    // The reply.html() method is provided by FastifyVite
    server.get("/*", (req, reply) => {
      return reply.html()
    })
  }

  // Global error handler
  await server.setErrorHandler((error, request, reply) => {
    // Type guard: check if error is an Error instance
    if (error instanceof Error) {
      const fastifyError = error as FastifyError
      const statusCode = fastifyError.statusCode || 500
      const code = fastifyError.code || "Internal Server Error"
      const message = error.message || "Internal Server Error"

      reply.status(statusCode).send({
        status: code,
        message: message,
      })
    } else {
      // Fallback for truly unknown errors
      reply.status(500).send({
        status: "Internal Server Error",
        message: "An unexpected error occurred",
      })
    }
  })

  // Start the server
  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

startServer()
