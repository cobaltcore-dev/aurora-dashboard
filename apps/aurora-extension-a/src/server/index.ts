import Fastify from "fastify"
import {
  auroraFastifyTRPCPlugin,
  AuroraFastifyTRPCPluginOptions,
  createAuroraOpenstackDevContext,
} from "@cobaltcore-dev/aurora-sdk/server"
import { registerRouter, AppRouter } from "./routers" // tRPC router
import * as dotenv from "dotenv"

dotenv.config()

const PORT = process.env.PORT || "4005"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"

const { appRouter } = registerRouter()

const server = Fastify({
  logger: true, // Enable logging for the server
  maxParamLength: 5000, // Set a max length for URL parameters
})

async function startServer() {
  const createContext = await createAuroraOpenstackDevContext({
    endpointUrl: process.env.OS_AUTH_URL || "http://localhost:8080/identity/v3/",
    domain: process.env.OS_DOMAIN_NAME || "Default",
    user: process.env.OS_USERNAME || "admin",
    password: process.env.OS_PASSWORD || "password",
  })

  // Register the tRPC plugin to handle API routes for the application
  await server.register(auroraFastifyTRPCPlugin, {
    prefix: BFF_ENDPOINT, // Prefix for tRPC routes
    trpcOptions: {
      router: appRouter, // Pass the tRPC router to handle routes
      createContext, // Create a context for the tRPC router
    } satisfies AuroraFastifyTRPCPluginOptions<AppRouter>["trpcOptions"], // Type-safety to ensure proper config
  })

  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

startServer()
