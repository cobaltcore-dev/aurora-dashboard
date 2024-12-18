import { ApolloClient, InMemoryCache } from "@apollo/client"

const client = new ApolloClient({
  uri: "/polaris-bff",
  cache: new InMemoryCache(),
})

export default client
