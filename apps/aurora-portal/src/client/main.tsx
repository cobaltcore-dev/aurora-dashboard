import { createRoot } from "react-dom/client"
import "tailwindcss/tailwind.css"

import App from "./App"

const container = document.getElementById("app")!

createRoot(container).render(<App />)
