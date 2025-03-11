import { AppShellProvider } from "../components/AppshellProvider"

import { AppContent } from "./AppContent"
import { AuroraProvider } from "./AuroraProvider"
import { AppRouter } from "./AppRouter"
import { StoreProvider } from "../store/StoreProvider"

export default function App() {
  return (
    <StoreProvider>
      {/* <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark"> */}
      <AppShellProvider theme="theme-dark">
        <AuroraProvider>
          <AppRouter>
            <AppContent />
          </AppRouter>
        </AuroraProvider>
      </AppShellProvider>
    </StoreProvider>
  )
}
