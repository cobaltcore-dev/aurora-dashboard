import { AppShell, AppShellProvider } from "@cloudoperators/juno-ui-components"
import { AppContent } from "./AppContent"
import { Toaster } from "sonner"
import { AuthProvider } from "./store/AuthProvider"
import styles from "./index.css?inline"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { messages } from "../locales/en/messages"
import { messages as messagesDe } from "../locales/de/messages"
import { ErrorBoundary } from "react-error-boundary"

i18n.load({
  en: messages,
  de: messagesDe,
})
i18n.activate("de")

type AppProps = {
  theme?: "theme-dark" | "theme-light"
}
const App = (props: AppProps) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <div role="alert" style={{ padding: 24 }}>
        <p>Something went wrong:</p>
        <pre style={{ color: "red" }}>{error.message}</pre>
        <button onClick={resetErrorBoundary}>Try again</button>
      </div>
    )}
  >
    <I18nProvider i18n={i18n}>
      <AppShellProvider shadowRoot={false} theme={`${props.theme ? props.theme : "theme-dark"}`}>
        <AppShell fullWidthContent={true} topNavigation={false} pageHeader={false} embedded={false}>
          <style>{styles.toString()}</style>
          <Toaster theme="dark" position="top-center" />
          {/* load styles inside the shadow dom */}

          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </AppShell>
      </AppShellProvider>
    </I18nProvider>
  </ErrorBoundary>
)

export default App
