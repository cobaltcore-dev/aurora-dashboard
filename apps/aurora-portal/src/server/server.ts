import Fastify from "fastify"
import FastifyStatic from "@fastify/static"
import FastifyVite from "@fastify/vite"
import FastifyCookie from "@fastify/cookie"
import FastifyCsrfProtection from "@fastify/csrf-protection"
import FastifyHelmet from "@fastify/helmet"
import { AuroraFastifyTRPCPluginOptions, auroraFastifyTRPCPlugin } from "@cobaltcore-dev/aurora-sdk/server"
import { appRouter, AuroraRouter } from "./routers" // tRPC router
import { createContext } from "./context"
import * as dotenv from "dotenv"
import path from "path"
import { ZodError } from "zod"
import extensions from "../extensions"

// Load environment variables from .env file
dotenv.config()

// Determine environment and configuration
const isProduction = process.env.NODE_ENV === "production"
const PORT = process.env.PORT || "4005"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

// Initialize Fastify server
const server = Fastify({
  logger: true,
  maxParamLength: 5000, // Increased limit for handling large requests
})

async function startServer() {
  // Register cookie middleware - required for session management and CSRF
  server.register(FastifyCookie, {
    secret: undefined, // Should be set to a secure value in production
  })

  // CSRF Protection setup
  server.register(FastifyCsrfProtection, {
    cookieKey: "aurora-csrf-protection", // Cookie name for storing CSRF token
    getToken: (request) => {
      // Extract CSRF token from custom header
      const token = request.headers["x-csrf-token"]
      return Array.isArray(token) ? token[0] : token
    },
  })

  // Endpoint to get a new CSRF token
  server.get("/csrf-token", (request, reply) => {
    const csrfToken = reply.generateCsrf()
    return { csrfToken }
  })

  // Validate CSRF token for mutating requests
  server.addHook("preHandler", async (request, reply) => {
    if (["POST", "PUT", "DELETE"].includes(request.method)) {
      server.csrfProtection(request, reply, () => {
        // Validation passes, request continues
      })
    }
  })

  // Register extension server handlers
  if (extensions.length > 0) {
    // Register each extension's server handler
    for (const ext of extensions) {
      // Dynamically import the extension module
      const extensionModule = await import(ext.entrypoint)
      // Ensure the module has a default export or named export
      const { registerServer } = extensionModule.default || extensionModule
      // If the extension has a server registration function, call it
      if (registerServer) {
        const { handleRequest, path: bffPath } = await registerServer({
          mountRoute: `/extensions/${ext.id}`,
        })

        await server.all(bffPath + "/*", (req, res) => {
          req.raw.url = req.raw.url?.replace(bffPath, "")
          return handleRequest(req.raw, res.raw)
        })
      }
    }
  }

  // Register tRPC plugin to handle API routes
  await server.register(auroraFastifyTRPCPlugin, {
    prefix: BFF_ENDPOINT, // All tRPC routes will be under this prefix
    trpcOptions: {
      router: appRouter,
      createContext,
      onError: (err) => {
        // Format Zod validation errors for better client-side handling
        if (err.error.cause instanceof ZodError)
          err.error.message = err.error.cause.errors.map((e) => e.message).join(",")
      },
    } satisfies AuroraFastifyTRPCPluginOptions<AuroraRouter>["trpcOptions"],
  })

  // Environment-specific setup
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

    // Register Vite plugin for development with HMR support
    await server.register(FastifyVite, {
      root: path.resolve(__dirname, "../../"), // Location of vite.config.js
      dev: true, // Enable dev mode
      spa: true, // SPA mode (no SSR)
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
