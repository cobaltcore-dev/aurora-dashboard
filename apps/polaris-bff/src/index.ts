import { ApolloServer } from "@apollo/server"
import { startStandaloneServer } from "@apollo/server/standalone"
import { addMocksToSchema } from "@graphql-tools/mock"
import { createSchema } from "./schema"

async function startApolloServer() {
  const schema = await createSchema()

  // Optionally apply mocks
  const mockedSchema = addMocksToSchema({
    schema,
    mocks: {
      // You can override specific fields if needed
    },
  })

  // Create Apollo Server
  const server = new ApolloServer({
    schema: mockedSchema,
  })

  const { url } = await startStandaloneServer(server)

  console.log(`
      🚀  Server is running
      📭  Query at ${url}
    `)
}

startApolloServer()
