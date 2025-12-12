import { createRoot } from "react-dom/client"
import App from "./App"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { messages } from "../locales/en/messages"
import { messages as messagesDe } from "../locales/de/messages"

// Language configuration
const SUPPORTED_LOCALES = ["en", "de"] as const
const DEFAULT_LOCALE = "en"
const STORAGE_KEY = "aurora-locale"

type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Detects the best language to use based on:
 * 1. Previously saved preference (localStorage)
 * 2. Browser language settings
 * 3. Default fallback
 */
function detectLanguage(): SupportedLocale {
  // 1. Check saved preference
  const savedLocale = localStorage.getItem(STORAGE_KEY)
  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale as SupportedLocale)) {
    return savedLocale as SupportedLocale
  }

  // 2. Check browser languages (navigator.languages is ordered by preference)
  const browserLanguages = navigator.languages || [navigator.language]

  for (const browserLang of browserLanguages) {
    // Try exact match first (e.g., "de-DE" -> "de")
    const langCode = browserLang.split("-")[0].toLowerCase()

    if (SUPPORTED_LOCALES.includes(langCode as SupportedLocale)) {
      return langCode as SupportedLocale
    }
  }

  // 3. Fallback to default
  return DEFAULT_LOCALE
}

// Load messages
i18n.load({
  en: messages,
  de: messagesDe,
})

// Detect and activate language
const detectedLocale = detectLanguage()
i18n.activate(detectedLocale)

// Save detected language if not already saved
if (!localStorage.getItem(STORAGE_KEY)) {
  localStorage.setItem(STORAGE_KEY, detectedLocale)
}

const container = document.getElementById("app")!
createRoot(container).render(
  <I18nProvider i18n={i18n}>
    <App />
  </I18nProvider>
)
