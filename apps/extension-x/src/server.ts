import Fastify from "fastify"
import FastifyVite from "@fastify/vite"
import FastifyStatic from "@fastify/static"

import path from "path"
import appInterface from "./interface"

const PORT = "4005"
const isProduction = process.env.NODE_ENV === "production"

const server = Fastify({
  logger: true, // Enable logging for the server
  maxParamLength: 5000, // Set a max length for URL parameters
})

async function startServer() {
  const createContext = async () =>
    Promise.resolve({
      validateSession: () => true,
    })

  if (appInterface.registerServer) {
    const { handleRequest } = await appInterface.registerServer({
      mountRoute: "",
    })

    const path = "/_bff"
    await server.all(path + "/*", (req, res) => {
      req.raw.url = req.raw.url?.replace(path, "")
      return handleRequest(req.raw, res.raw)
    })
  }

  if (isProduction) {
    // Serve static files in production
    await server.register(FastifyStatic, {
      root: path.resolve(__dirname, "../../dist"),
      prefix: "/",
    })
  } else {
    // In development, use FastifyVite
    await server.register(FastifyVite, {
      root: path.resolve(__dirname, "../"),
      dev: true,
      spa: true,
    })
    await server.vite.ready()

    // SPA fallback for development
    server.get("/*", (req, reply) => {
      return reply.html()
    })
  }

  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

startServer()
