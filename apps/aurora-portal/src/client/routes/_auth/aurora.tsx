import { createFileRoute } from "@tanstack/react-router"

import { useAuth } from "../../store/AuthProvider"
import { Trans } from "@lingui/react/macro"

export const Route = createFileRoute("/_auth/aurora")({
  component: DashboardPage,
})

function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="grid gap-2 p-2">
      <p>
        <Trans>Hi</Trans> {user?.name}
      </p>
      <p>
        <Trans>You are currently on the dashboard route.</Trans>
      </p>
    </div>
  )
}
