import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { AppContent } from "./AppContent"
import { AuroraProvider } from "./AuroraProvider"
import { AppRouter } from "./AppRouter"

export default function App() {
  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark">
      <AuroraProvider>
        <AppRouter>
          <AppContent />
        </AppRouter>
      </AuroraProvider>
    </AppShellProvider>
  )
}
