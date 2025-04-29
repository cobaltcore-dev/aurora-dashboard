// AppContent.tsx
import { trpcClient } from "./trpcClient"
import { routeTree } from "./routeTree.gen"
import { RouterProvider, createRouter } from "@tanstack/react-router"
import { useAuth } from "./store/AuthProvider"
// Register things for typesafety

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

// Set up a Router instance
const router = createRouter({
  routeTree,
  context: {
    trpcClient: undefined!,
    auth: undefined!,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
})

export function AppContent() {
  const auth = useAuth()
  return (
    <div className="content">
      <RouterProvider context={{ trpcClient, auth }} router={router} />
    </div>
  )
}
