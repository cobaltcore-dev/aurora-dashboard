import Fastify, { FastifyError } from "fastify"
import FastifyStatic from "@fastify/static"
import FastifyVite from "@fastify/vite"
import FastifyCookie from "@fastify/cookie"
import FastifyHelmet from "@fastify/helmet"
import FastifyMultipart, { MultipartFields, MultipartValue } from "@fastify/multipart"
import { CreateFastifyContextOptions, FastifyTRPCPluginOptions, fastifyTRPCPlugin } from "@trpc/server/adapters/fastify"
import { appRouter, AuroraRouter } from "./routers" // tRPC router
import { createContext } from "./context"
import * as dotenv from "dotenv"
import path from "path"
import { Readable } from "node:stream"
import { ZodError } from "zod"
import { AuroraFastifySessionFromToken, AuroraFastifyCsrfProtection } from "./aurora-fastify-plugins"

// Load environment variables from .env file
dotenv.config()

// Determine environment and configuration
const isProduction = process.env.NODE_ENV === "production"
const PORT = process.env.PORT || "4005"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

// Initialize Fastify server
const server = Fastify({
  logger: true,
  // Increase ALL limits
  maxParamLength: 5000,
  bodyLimit: 1024 * 1024 * 1024, // 1GB body limit
  requestTimeout: 600000, // 10 minutes (600 seconds)
  keepAliveTimeout: 600000, // 10 minutes keep-alive
})

async function startServer() {
  // Register cookie middleware - required for session management and CSRF
  server.register(FastifyCookie, {
    secret: undefined, // Should be set to a secure value in production
  })

  // Register multipart/form-data support - MUST be before tRPC
  await server.register(FastifyMultipart, {
    limits: {
      fileSize: 1024 * 1024 * 1024, // 1GB body limit
      files: 10, // max 10 files per request
    },
  })

  // Add support for application/octet-stream content type
  server.addContentTypeParser("application/octet-stream", { parseAs: "buffer" }, (req, body, done) => {
    done(null, body)
  })

  // Custom file upload endpoint (before tRPC registration)
  server.post(`${BFF_ENDPOINT}/upload-image`, async (request, reply) => {
    try {
      // Reuse tRPC context for authentication check
      const ctx = await createContext({ req: request, res: reply } as CreateFastifyContextOptions)

      if (!ctx.validateSession()) {
        return reply.code(401).send({ message: "Unauthorized" })
      }

      // Parse multipart form data with file size limit
      const data = await request.file({
        limits: {
          fileSize: 1024 * 1024 * 1024, // 1GB max
        },
      })

      if (!data) {
        return reply.code(400).send({ message: "No file" })
      }

      // Extract additional fields from request
      const fields: MultipartFields = data.fields
      const imageId = (fields.imageId as MultipartValue)?.value

      if (!imageId) {
        return reply.code(400).send({ message: "No imageId provided" })
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
        return reply.code(413).send({ message: "File too large", maxSize: "1GB" })
      }

      return reply.code(500).send({ message })
    }
  })

  // Register session restoration plugin
  server.register(AuroraFastifySessionFromToken, {
    route: "/auth/restore-session", // Custom route for restoring session from token
  })

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
          err.error.message = err.error.cause.errors.map((e) => e.message).join(",")
      },
    } satisfies FastifyTRPCPluginOptions<AuroraRouter>["trpcOptions"],
  })

  // Environment-specific setup
  // Do not use vite plugin in production
  if (isProduction) {
    // PRODUCTION MODE

    // Register security headers
    server.register(FastifyHelmet)

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
    reply.status(error.statusCode || 500).send({
      status: error.code || "Internal Server Error",
      message: error.message || "Internal Server Error",
    })
  })

  // Start the server
  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

startServer()
