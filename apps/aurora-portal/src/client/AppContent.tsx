// AppContent.tsx
import { trpcClient } from "./trpcClient"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router"
import { useAuth } from "./store/AuthProvider"

export function AppContent() {
  const auth = useAuth()
  return (
    <div className="content">
      <RouterProvider context={{ trpcClient, auth }} router={router} />
    </div>
  )
}
