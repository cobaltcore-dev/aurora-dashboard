import Fastify from "fastify"
import FastifyVite from "@fastify/vite"
import { fastifyTRPCPlugin, FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify"
import { registerRouter, AppRouter } from "./routers" // tRPC router
import * as dotenv from "dotenv"
import path from "path"

dotenv.config()

const PORT = process.env.PORT || "4000"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

const { appRouter } = registerRouter()

const server = Fastify({
  logger: true, // Enable logging for the server
  maxParamLength: 5000, // Set a max length for URL parameters
})

async function run() {
  // Register the tRPC plugin to handle API routes for the application
  await server.register(fastifyTRPCPlugin, {
    prefix: BFF_ENDPOINT, // Prefix for tRPC routes
    trpcOptions: {
      router: appRouter, // Pass the tRPC router to handle routes
    } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"], // Type-safety to ensure proper config
  })

  await server.register(FastifyVite, {
    root: path.join(__dirname, "../../"), // new URL("../../", import.meta.url).href, // where to look for vite.config.js
    dev: true,
    spa: true,
  })

  server.get("/*", (req, reply) => {
    return reply.html()
  })
  await server.vite.ready()

  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

run()
