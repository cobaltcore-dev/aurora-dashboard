import { createRoot } from "react-dom/client"
import { AuroraApp } from "@cobaltcore-dev/aurora/client"

const container = document.getElementById("app")!
createRoot(container).render(<AuroraApp />)
