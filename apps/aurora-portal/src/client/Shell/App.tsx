import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { AuthProvider } from "./AuthProvider"
import { AppContent } from "./AppContent"

export default function App() {
  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppShellProvider>
  )
}
