import { AppShellProvider } from "./components/AppshellProvider"

import { AppContent } from "./AppContent"
import { Toaster } from "sonner"
import { AuthProvider } from "./store/AuthProvider"

export default function App() {
  return (
    <AppShellProvider theme="theme-dark">
      <Toaster theme="dark" position="top-center" />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </AppShellProvider>
  )
}
