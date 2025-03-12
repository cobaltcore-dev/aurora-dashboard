import { AppShellProvider } from "../components/AppshellProvider"
import { AppContent } from "./AppContent"
import { AuroraProvider } from "./AuroraProvider"
import { AppRouter } from "./AppRouter"
import { StoreProvider } from "../store/StoreProvider"
import { ErrorBoundary } from "react-error-boundary"

export default function App() {
  return (
    <StoreProvider>
      <AppShellProvider theme="theme-dark">
        <AuroraProvider>
          <AppRouter>
            <ErrorBoundary fallback={<p>Something went wrong</p>}>
              <AppContent />
            </ErrorBoundary>
          </AppRouter>
        </AuroraProvider>
      </AppShellProvider>
    </StoreProvider>
  )
}
