import Fastify from "fastify"
import FastifyVite from "@fastify/vite"
import {
  auroraFastifyTRPCPlugin,
  AuroraFastifyTRPCPluginOptions,
  AuroraContext,
} from "@cobaltcore-dev/aurora-sdk/server"
import { appRouter, AppRouter } from "../bff/routers" // tRPC router

import path from "path"
import { handleRequest } from "../interface"

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

  server.all(BFF_ENDPOINT + "/*", (req, res) => {
    handleRequest(req.raw, res.raw)
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
