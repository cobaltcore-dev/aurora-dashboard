import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import junoStyle from "./junoStyle.css?inline"

import App from "./App"

const container = document.getElementById("app")!

createRoot(container).render(
  <StrictMode>
    <style>{junoStyle}</style>
    <App />
  </StrictMode>
)
