import Fastify from "fastify"
import FastifyStatic from "@fastify/static"
import cookie from "@fastify/cookie"
import { AuroraFastifyTRPCPluginOptions, auroraFastifyTRPCPlugin } from "@cobaltcore-dev/aurora-sdk/server"
import { appRouter, AuroraRouter } from "./routers" // tRPC router
import { createContext } from "./context"
import * as dotenv from "dotenv"
import path from "path"
import { ZodError } from "zod"

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
      onError: (err) => {
        // handle ZodError messages
        //
        if (err.error.cause instanceof ZodError)
          err.error.message = err.error.cause.errors.map((e) => e.message).join(",")
      },
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
    reply.status(error.statusCode || 500).send({
      status: error.code || "Internal Server Error",
      message: error.message || "Internal Server Error",
    })
  })

  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

startServer()
