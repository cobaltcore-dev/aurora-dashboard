import Fastify from "fastify"
import FastifyVite from "@fastify/vite"
import FastifyStatic from "@fastify/static"
import { fastifyTRPCPlugin, FastifyTRPCPluginOptions } from "@trpc/server/adapters/fastify"
import { appRouter, AuroraRouter } from "./routers" // tRPC router
import * as dotenv from "dotenv"
import path from "path"

dotenv.config()

const isProduction = process.env.NODE_ENV === "production"
const PORT = process.env.PORT || "4000"
const BFF_ENDPOINT = process.env.BFF_ENDPOINT || "/polaris-bff"
const server = Fastify()

async function run() {
  // Register the tRPC plugin to handle API routes for the application
  await server.register(fastifyTRPCPlugin, {
    prefix: BFF_ENDPOINT, // Prefix for tRPC routes
    trpcOptions: {
      router: appRouter, // Pass the tRPC router to handle routes
    } satisfies FastifyTRPCPluginOptions<AuroraRouter>["trpcOptions"], // Type-safety to ensure proper config
  })

  // Use fastify-static to serve static files in production mode
  // FastifyVite also uses the FastifyStatic plugin internally
  // but iit has an issue with serving static files in production mode
  // see: https://github.com/fastify/fastify-vite/issues/184
  // once the issue is resolved, we can remove this block
  // and use FastifyVite to serve static files in production mode
  // consider change dev: true to dev: !isProduction
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
  } else {
    await server.register(FastifyVite, {
      root: path.join(__dirname, "../../"), // new URL("../../", import.meta.url).href, // where to look for vite.config.js
      dev: true,
      spa: true,
    })

    server.get("/*", (req, reply) => {
      return reply.html()
    })
    await server.vite.ready()
  }

  await server.listen({ host: "0.0.0.0", port: Number(PORT) }).then((address) => {
    console.log(`Server listening on ${address}`)
  })
}

run()
