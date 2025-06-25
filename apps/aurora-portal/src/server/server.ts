import Fastify from "fastify"
import FastifyStatic from "@fastify/static"
import FastifyVite from "@fastify/vite"
import FastifyCookie from "@fastify/cookie"
import FastifyHelmet from "@fastify/helmet"
import { FastifyTRPCPluginOptions, fastifyTRPCPlugin } from "@trpc/server/adapters/fastify"
import { appRouter, AuroraRouter } from "./routers" // tRPC router
import { createContext } from "./context"
import * as dotenv from "dotenv"
import path from "path"
import { ZodError } from "zod"
import extensions from "../extensions"
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
  maxParamLength: 5000, // Increased limit for handling large requests
})

async function startServer() {
  // Register cookie middleware - required for session management and CSRF
  server.register(FastifyCookie, {
    secret: undefined, // Should be set to a secure value in production
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
          if (req.body) {
            Object.defineProperty(req.raw, "body", {
              value: req.body,
              writable: false,
            })
            req.raw.headers["content-length"] =
              req.headers["content-length"] || Buffer.byteLength(JSON.stringify(req.body)).toString()
          }
          return handleRequest(req.raw, res.raw)
        })
      }
    }
  }

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
