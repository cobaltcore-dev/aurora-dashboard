import { createRoot } from "react-dom/client"
import App from "./App"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { messages } from "../locales/en/messages"
import { messages as messagesDe } from "../locales/de/messages"

i18n.load({
  en: messages,
  de: messagesDe,
})

const savedLocale = localStorage.getItem("aurora-locale") || "en"
i18n.activate(savedLocale)

const container = document.getElementById("app")!
createRoot(container).render(
  <I18nProvider i18n={i18n}>
    <App />
  </I18nProvider>
)
