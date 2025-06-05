import { createRoot } from "react-dom/client"
import "tailwindcss/tailwind.css"
import App from "./App"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { messages } from "../locales/en/messages"
import { messages as messagesDe } from "../locales/de/messages"

i18n.load({
  en: messages,
  de: messagesDe,
})
i18n.activate("en")

const container = document.getElementById("app")!
createRoot(container).render(
  <I18nProvider i18n={i18n}>
    <App />
  </I18nProvider>
)
