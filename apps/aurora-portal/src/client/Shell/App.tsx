import { AppShellProvider } from "../components/AppshellProvider"

import { AppContent } from "./AppContent"
import { AuroraProvider } from "./AuroraProvider"
import { StoreProvider } from "../store/StoreProvider"
import { Toaster } from "sonner"

export default function App() {
  return (
    <StoreProvider>
      {/* <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark"> */}
      <AppShellProvider theme="theme-dark">
        <Toaster theme="dark" position="top-center" />
        <AuroraProvider>
          <AppContent />
        </AuroraProvider>
      </AppShellProvider>
    </StoreProvider>
  )
}
