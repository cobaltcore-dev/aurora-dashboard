import Fastify from "fastify"
import FastifyVite from "@fastify/vite"
import {
  auroraFastifyTRPCPlugin,
  AuroraFastifyTRPCPluginOptions,
  AuroraContext,
} from "@cobaltcore-dev/aurora-sdk/server"
import { appRouter, AppRouter } from "../bff/routers" // tRPC router

import path from "path"

const PORT = "4005"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

const server = Fastify({
  logger: true, // Enable logging for the server
  maxParamLength: 5000, // Set a max length for URL parameters
})

async function startServer() {
  const createContext = async () =>
    Promise.resolve({
      validateSession: () => true,
    })

  // Register the tRPC plugin to handle API routes for the application
  await server.register(auroraFastifyTRPCPlugin, {
    prefix: BFF_ENDPOINT, // Prefix for tRPC routes
    trpcOptions: {
      router: appRouter, // Pass the tRPC router to handle routes
      createContext, // Create a context for the tRPC router
    } satisfies AuroraFastifyTRPCPluginOptions<AppRouter>["trpcOptions"], // Type-safety to ensure proper config
  })

  // In development, use FastifyVite
  await server.register(FastifyVite, {
    root: path.resolve(__dirname, "../../"),
    dev: true,
    spa: true,
  })
  await server.vite.ready()

  // SPA fallback for development
  server.get("/*", (req, reply) => {
    return reply.html()
  })

  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

startServer()
