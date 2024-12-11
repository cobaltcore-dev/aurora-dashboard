import "reflect-metadata"
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { buildSchema } from "type-graphql"
import { getResolvers } from "./resolvers"
import * as dotenv from "dotenv"

import { getApis } from "./apis"

// Load environment variables from .env file
dotenv.config()
const port = Number(process.env.PORT || 4000)

async function startApolloServer() {
  // Get all APIs
  const apis = await getApis()
  // Get resolvers and build schema
  const resolvers = await getResolvers()
  // Build schema
  const schema = await buildSchema({ resolvers })

  // Create Apollo Server
  const server = new ApolloServer({ schema })

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async () => {
      return {
        dataSources: apis,
      }
    },
  })

  console.log(`
      🚀  Server is running
      📭  Query at ${url}
    `)
}

startApolloServer()
