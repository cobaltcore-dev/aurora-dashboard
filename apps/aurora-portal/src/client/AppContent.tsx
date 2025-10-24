// AppContent.tsx
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { trpcReact, trpcClient, createTrpcReactClient } from "./trpcClient"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router"
import { useAuth } from "./store/AuthProvider"

export function AppContent() {
  const auth = useAuth()

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  const [trpcReactClient] = useState(() => createTrpcReactClient())

  return (
    <trpcReact.Provider client={trpcReactClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <div className="content">
          <RouterProvider context={{ trpcReact, trpcClient, auth }} router={router} />
        </div>
      </QueryClientProvider>
    </trpcReact.Provider>
  )
}
