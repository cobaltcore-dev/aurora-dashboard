// AppContent.tsx
import { trpcClient } from "./trpcClient"
import { RouterProvider } from "@tanstack/react-router"
import { router } from "./router"
import { useAuth } from "./store/AuthProvider"
import { Modal } from "@cloudoperators/juno-ui-components"

export function AppContent() {
  const auth = useAuth()
  return (
    <div className="content">
      <RouterProvider
        context={{ trpcClient, auth }}
        router={router}
        defaultErrorComponent={({ error }) => {
          return (
            <Modal open title="Something went wrong">
              <pre style={{ color: "red" }}>{error.message}</pre>
              <pre style={{ color: "red" }}>{JSON.stringify(error.cause)}</pre>
            </Modal>
          )
        }}
      />
    </div>
  )
}
