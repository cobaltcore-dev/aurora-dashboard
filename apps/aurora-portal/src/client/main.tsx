import { createRoot } from "react-dom/client"
import App from "./App"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { messages } from "../locales/en/messages"
import { messages as messagesDe } from "../locales/de/messages"
import { detectLanguage } from "./utils/languageDetection"

// Load messages
i18n.load({
  en: messages,
  de: messagesDe,
})

// Detect and activate language
const detectedLocale = detectLanguage()
i18n.activate(detectedLocale)

const container = document.getElementById("app")!
createRoot(container).render(
  <I18nProvider i18n={i18n}>
    <App />
  </I18nProvider>
)
