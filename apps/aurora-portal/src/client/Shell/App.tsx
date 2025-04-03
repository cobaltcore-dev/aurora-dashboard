import { AppShellProvider } from "../components/AppshellProvider"
import { BrowserRouter } from "react-router-dom"

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
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuroraProvider>
      </AppShellProvider>
    </StoreProvider>
  )
}
