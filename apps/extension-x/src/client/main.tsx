import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
// import { App } from "./App"
import { App } from "../interface"

const container = document.getElementById("app")!

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
