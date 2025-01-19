import Fastify from "fastify"
import { fastifyTRPCPlugin, FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify"
import { registerRouter, AppRouter } from "./routers" // tRPC router
import * as dotenv from "dotenv"

dotenv.config()

const PORT = process.env.PORT || "4000"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

const { appRouter } = registerRouter()

// Create a Fastify instance with some basic options
const fastify = Fastify({
  logger: true, // Enable logging for the server
  maxParamLength: 5000, // Set a max length for URL parameters
})

// Register the tRPC plugin to handle API routes for the application
fastify.register(fastifyTRPCPlugin, {
  prefix: BFF_ENDPOINT, // Prefix for tRPC routes
  trpcOptions: {
    router: appRouter, // Pass the tRPC router to handle routes
  } satisfies FastifyTRPCPluginOptions<AppRouter>["trpcOptions"], // Type-safety to ensure proper config
})

// Start the server and listen on the specified port and host
fastify.listen({ host: "0.0.0.0", port: Number(PORT) }, function (err, address) {
  if (err) {
    fastify.log.error(err) // Log the error if the server fails to start
    process.exit(1) // Exit the process with an error code
  }
  // Server is now listening, log the address the server is listening on
  fastify.log.info(`Server is running at ${address}`)
})
