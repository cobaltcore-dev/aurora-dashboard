import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { registerClient } from "."
import { trpcClient } from "./trpcClient"

const container = document.getElementById("app")!
const { App, Logo } = registerClient()

createRoot(container).render(
  <StrictMode>
    <Logo />
    <App client={trpcClient} />
  </StrictMode>
)
