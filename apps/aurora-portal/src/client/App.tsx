import { AppShell, AppShellProvider } from "@cloudoperators/juno-ui-components"
import { AppContent } from "./AppContent"
import { Toaster } from "sonner"
import { AuthProvider } from "./store/AuthProvider"
import styles from "./index.css?inline"
import { i18n } from "@lingui/core"
import { I18nProvider } from "@lingui/react"
import { ErrorBoundary } from "react-error-boundary"
import { Trans } from "@lingui/react/macro"

type AppProps = {
  theme?: "theme-dark" | "theme-light"
}
const App = (props: AppProps) => (
  <ErrorBoundary
    fallbackRender={({ error, resetErrorBoundary }) => (
      <div role="alert" style={{ padding: 24 }}>
        <p>
          <Trans>Something went wrong:</Trans>
        </p>
        <pre style={{ color: "red" }}>{error.message}</pre>
        <button onClick={resetErrorBoundary}>
          <Trans>Try again</Trans>
        </button>
      </div>
    )}
  >
    <I18nProvider i18n={i18n}>
      <AppShellProvider shadowRoot={false} theme={`${props.theme ? props.theme : "theme-dark"}`}>
        <AppShell topNavigation={false} pageHeader={true} embedded={true}>
          <style>{styles.toString()}</style>
          <Toaster theme="dark" position="top-center" />
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </AppShell>
      </AppShellProvider>
    </I18nProvider>
  </ErrorBoundary>
)

export default App
