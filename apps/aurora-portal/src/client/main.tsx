import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./Shell"

const container = document.getElementById("app")!

import("../../manifest.json")
  .then((manifest) => {
    createRoot(container).render(
      <StrictMode>
        <App manifest={manifest.default} />
      </StrictMode>
    )
  })
  .catch((error) =>
    createRoot(container).render(
      <StrictMode>
        <h1>Error: Could not load manifest</h1>
        <p>{error.message}</p>
      </StrictMode>
    )
  )
