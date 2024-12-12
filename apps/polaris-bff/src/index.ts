import "reflect-metadata"
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { buildSchema } from "type-graphql"
import resolvers from "./resolvers"
import apis from "./apis"

import * as dotenv from "dotenv"

// Load environment variables from .env file
dotenv.config()
const port = Number(process.env.PORT || 4000)

async function startApolloServer() {
  // Build schema
  const schema = await buildSchema({ resolvers })

  // Create Apollo Server
  const server = new ApolloServer({ schema })

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ res, req }) => {
      return {
        dataSources: apis,
        req,
        res,
      }
    },
  })

  console.log(`
      🚀  Server is running
      📭  Query at ${url}
    `)
}

startApolloServer()
