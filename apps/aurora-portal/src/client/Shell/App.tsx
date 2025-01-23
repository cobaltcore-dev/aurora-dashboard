import { useState } from "react"
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { trpcClient, trpc } from "../trpcClient"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "./AuthProvider"
import { AppContent } from "./AppContent"

export default function App() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark">
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="grid grid-cols-[max-content_auto] grid-rows-[minmax(100vh,100%)]">
              <AppContent />
            </div>
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </AppShellProvider>
  )
}
