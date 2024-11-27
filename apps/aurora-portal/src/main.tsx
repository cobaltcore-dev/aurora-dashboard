import { createRoot } from "react-dom/client"
import React from "react"
import App from "./components/App"
import { ApolloProvider } from "@apollo/client"
import "./style.css"
import client from "./apollo-client"

const container = document.getElementById("app")
const root = createRoot(container!)

root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>
)
