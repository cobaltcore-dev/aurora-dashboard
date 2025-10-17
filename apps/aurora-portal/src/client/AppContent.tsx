// AppContent.tsx
import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { httpBatchLink } from "@trpc/client"
import { trpcReact, trpcClient } from "./trpcClient"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router"
import { useAuth } from "./store/AuthProvider"

declare const BFF_ENDPOINT: string

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

  const [trpcReactClient] = useState(() =>
    trpcReact.createClient({
      links: [
        httpBatchLink({
          url: BFF_ENDPOINT,
          async headers() {
            const { csrfToken } = await fetch("/csrf-token").then((res) => res.json())
            return {
              "x-csrf-token": csrfToken,
            }
          },
        }),
      ],
    })
  )

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
