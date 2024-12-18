import "reflect-metadata"
import "./envs"
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { buildSchema } from "type-graphql"
import { resolvers } from "./resolvers"
import { getAPIAdapters } from "./apiManager"
import { getSessionData } from "./sessionCookieHandler"
import { Request } from "./types/context"

async function startApolloServer() {
  // Build schema
  const schema = await buildSchema({ resolvers })

  // Create Apollo Server
  const server = new ApolloServer({ schema })

  // get port from env or use 4000
  const port = Number(process.env.PORT || 4000)

  const { url } = await startStandaloneServer(server, {
    listen: { port },
    context: async ({ res, req }) => {
      // get cache from server
      const { cache } = server

      const contextData = {
        // pass cache to the api adapters
        dataSources: getAPIAdapters({ cache }),
        req,
        res,
        ...getSessionData(req as Request),
      }

      return contextData
    },
  })

  console.log(`
      🚀  Server is running
      📭  Query at ${url}
    `)
}

startApolloServer()
