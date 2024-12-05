import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
// import { addMocksToSchema } from "@graphql-tools/mock"
import { createSchema } from "./schema"
import * as dotenv from "dotenv"

// Load environment variables from .env file
dotenv.config()
const port = Number(process.env.PORT || 4000)

async function startApolloServer() {
  const schema = await createSchema()

  // // Optionally apply mocks
  // const mockedSchema = addMocksToSchema({
  //   schema,
  //   mocks: {
  //     // You can override specific fields if needed
  //   },
  // })

  // Create Apollo Server
  const server = new ApolloServer({
    //schema: mockedSchema,
    schema,
  })

  const { url } = await startStandaloneServer(server, {
    listen: { port },
  })

  console.log(`
      🚀  Server is running
      📭  Query at ${url}
    `)
}

startApolloServer()
