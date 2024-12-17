import { ApolloClient, InMemoryCache } from "@apollo/client"

const client = new ApolloClient({
  uri: "/__bff",
  cache: new InMemoryCache(),
})

export default client
