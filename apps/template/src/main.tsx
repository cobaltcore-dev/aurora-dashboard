import { createRoot } from "react-dom/client"
import React from "react"
import App from "./components/App"
import "./style.css"

const container = document.getElementById("app") as HTMLDivElement
const root = createRoot(container)

root.render(<App />)
