import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { AuthProvider } from "./AuthProvider"
import { AppContent } from "./AppContent"
import { AuroraProvider } from "./AuroraProvider"
import { AppRouter } from "./AppRouter"
export default function App() {
  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark">
      <AuthProvider>
        <AuroraProvider>
          <AppRouter>
            <AppContent />
          </AppRouter>
        </AuroraProvider>
      </AuthProvider>
    </AppShellProvider>
  )
}
