import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App"
import { trpcClient } from "./trpcClient"

const container = document.getElementById("app")!

createRoot(container).render(
  <StrictMode>
    <App client={trpcClient} />
  </StrictMode>
)
