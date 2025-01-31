import { useState } from "react"
import { AppShellProvider } from "@cloudoperators/juno-ui-components"
import { trpcClient, trpc } from "../trpcClient"

import { AuthProvider } from "./AuthProvider"
import { AppContent } from "./AppContent"
import { AuroraReactQueryClient, AuroraReactQueryClientProvider } from "@cobaltcore-dev/aurora-sdk"

export default function App() {
  const [queryClient] = useState(() => new AuroraReactQueryClient())

  return (
    <AppShellProvider stylesWrapper="head" shadowRoot={false} theme="theme-dark">
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <AuroraReactQueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="grid grid-cols-[max-content_auto] grid-rows-[minmax(100vh,100%)]">
              <AppContent />
            </div>
          </AuthProvider>
        </AuroraReactQueryClientProvider>
      </trpc.Provider>
    </AppShellProvider>
  )
}
