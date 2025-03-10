import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { AppContent } from "./AppContent"
import { AuroraProvider } from "./AuroraProvider"
import { AppRouter } from "./AppRouter"
import { StoreProvider } from "../store/StoreProvider"

export default function App() {
  return (
    <StoreProvider>
      <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark">
        <AuroraProvider>
          <AppRouter>
            <AppContent />
          </AppRouter>
        </AuroraProvider>
      </AppShellProvider>
    </StoreProvider>
  )
}
