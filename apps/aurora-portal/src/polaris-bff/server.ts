import Fastify from "fastify"
import FastifyStatic from "@fastify/static"
import cookie from "@fastify/cookie"
import { AuroraFastifyTRPCPluginOptions, AuroraSDKTRPCError, auroraFastifyTRPCPlugin } from "@cobaltcore-dev/aurora-sdk"
import { appRouter, AuroraRouter } from "./routers" // tRPC router
import { createContext } from "./context"
import * as dotenv from "dotenv"
import path from "path"

dotenv.config()

const isProduction = process.env.NODE_ENV === "production"
const PORT = process.env.PORT || "4004"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"
const server = Fastify({
  logger: true,
  maxParamLength: 5000,
})

async function startServer() {
  // Register Fastify Cookie Plugin
  server.register(cookie, {
    secret: undefined, // Replace with a secure secret for signing cookies
  })

  // Register the tRPC plugin to handle API routes for the application
  await server.register(auroraFastifyTRPCPlugin, {
    prefix: BFF_ENDPOINT, // Prefix for tRPC routes
    trpcOptions: {
      router: appRouter, // Pass the tRPC router to handle routes
      createContext, // Pass the context
    } satisfies AuroraFastifyTRPCPluginOptions<AuroraRouter>["trpcOptions"], // Type-safety to ensure proper config
  })

  // Use fastify-static to serve static files in production mode
  if (isProduction) {
    await server.register(FastifyStatic, {
      root: path.join(__dirname, "../../dist/client"),
      wildcard: false, // Prevent `/*` wildcard conflicts
      serve: true,
    })

    // In case of a SPA, we need to serve the index.html file for all routes
    // (wouter handles the routing on the client-side)
    server.get("/*", (req, reply) => {
      return reply.sendFile("index.html")
    })
  }

  await server.setErrorHandler((error, request, reply) => {
    server.log.error(error)

    // For tRPC errors
    if (error instanceof AuroraSDKTRPCError) {
      reply.status(400).send({
        status: error.code || "error",
        statusCode: 400,
        message: error.message || "A tRPC error occurred",
      })
    } else {
      // For generic errors
      reply.status(500).send({
        status: "error",
        statusCode: error.code || 500,
        message: error.message || "Internal Server Error",
      })
    }
  })

  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

startServer()
