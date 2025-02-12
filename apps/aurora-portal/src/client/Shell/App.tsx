import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { AuthProvider } from "./AuthProvider"
import { AppContent } from "./AppContent"

export default function App() {
  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark">
      <AuthProvider>
        <div className="grid grid-cols-[max-content_auto] grid-rows-[minmax(100vh,100%)]">
          <AppContent />
        </div>
      </AuthProvider>
    </AppShellProvider>
  )
}
