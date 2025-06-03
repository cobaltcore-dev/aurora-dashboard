import { AppShellProvider } from "./components/AppshellProvider"

import { AppContent } from "./AppContent"
import { Toaster } from "sonner"
import { AuthProvider } from "./store/AuthProvider"

import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { messages } from "../locales/en/messages"
import { messages as messagesDe } from "../locales/de/messages"

i18n.load({
  en: messages,
  de: messagesDe,
})
i18n.activate("de")

export default function App() {
  return (
    <I18nProvider i18n={i18n}>
      <AppShellProvider theme="theme-dark">
        <Toaster theme="dark" position="top-center" />
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </AppShellProvider>
    </I18nProvider>
  )
}
