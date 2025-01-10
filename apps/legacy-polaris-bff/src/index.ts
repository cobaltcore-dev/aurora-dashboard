import "reflect-metadata"
import "./envs"
import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { buildSchema } from "type-graphql"
import { resolvers } from "./resolvers"
import { getAPIAdapters } from "./apiManager"
import { SessionCookieHandler } from "./sessionCookieHandler"
import { BaseContext } from "./types/baseContext"

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

      const sessionCookieHandler = new SessionCookieHandler({ req, res })

      const contextData: BaseContext = {
        req,
        res,
        // pass cache to the api adapters
        dataSources: getAPIAdapters({ cache }),
        authToken: sessionCookieHandler.getSessionAuthToken(),
        setAuthToken: sessionCookieHandler.setSessionAuthToken,
        clearSessionCookie: sessionCookieHandler.clearSessionCookie,
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
