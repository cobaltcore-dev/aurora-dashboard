import Fastify from "fastify"
import FastifyVite from "@fastify/vite"
import FastifyStatic from "@fastify/static"

import path from "path"
import extension from "./extension"
import { IncomingMessage } from "http"

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

  if (extension.registerServer) {
    const { handleRequest, path: bffPath } = await extension.registerServer({ mountRoute: "" })

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

  if (isProduction) {
    // Serve static files from the build directory
    await server.register(FastifyStatic, {
      root: path.join(__dirname, "."),
      wildcard: false, // Prevent wildcard conflicts with API routes
      serve: true,
    })

    // SPA fallback - serve index.html for all unmatched routes
    // This enables client-side routing (React Router, etc.)
    server.get("/*", (req, reply) => {
      return reply.sendFile("index.html")
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
