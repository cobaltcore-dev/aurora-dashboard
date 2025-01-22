import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./Shell"

const container = document.getElementById("app")!

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
)
