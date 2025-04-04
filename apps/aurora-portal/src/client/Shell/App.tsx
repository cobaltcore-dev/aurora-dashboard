import { AppShellProvider } from "../components/AppshellProvider"
import { BrowserRouter } from "react-router-dom"

import { AppContent } from "./AppContent"
import { AuroraProvider } from "./AuroraProvider"
import { StoreProvider } from "../store/StoreProvider"
import { Toaster } from "sonner"
import { I18nProvider } from "@lingui/react"
import { i18n } from "@lingui/core"
import { messages } from "../../locales/en/messages"
import { messages as messagesDe } from "../../locales/de/messages"

i18n.load({
  en: messages,
  de: messagesDe,
})
i18n.activate("en")

export default function App() {
  return (
    <I18nProvider i18n={i18n}>
      <StoreProvider>
        {/* <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark"> */}
        <AppShellProvider theme="theme-dark">
          <Toaster theme="dark" position="top-center" />
          <AuroraProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </AuroraProvider>
        </AppShellProvider>
      </StoreProvider>
    </I18nProvider>
  )
}
