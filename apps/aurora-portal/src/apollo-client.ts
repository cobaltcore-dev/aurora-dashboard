import { ApolloClient, InMemoryCache } from "@apollo/client"

const client = new ApolloClient({
  uri: import.meta.env.VITE_POLARIS_BFF_PROXY_PATH || "/polaris-bff",
  cache: new InMemoryCache(),
})

export default client
