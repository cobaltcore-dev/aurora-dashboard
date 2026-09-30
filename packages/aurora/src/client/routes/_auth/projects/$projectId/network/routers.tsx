import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { Button } from "@cloudoperators/juno-ui-components"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

const RoutersErrorComponent = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  return (
    <RouteIdLevelDefaultError
      action={
        <Button
          variant="primary"
          onClick={() => navigate({ to: "/projects/$projectId/network/routers", params: { projectId } })}
        >
          {t`Back to Routers`}
        </Button>
      }
    />
  )
}

export const Route = createFileRoute("/_auth/projects/$projectId/network/routers")({
  staticData: {
    section: "network",
    service: "routers",
    crumb: { text: msg`Routers` },
  } satisfies RouteInfo,
  component: () => <Outlet />,
  // Render errors from the routers subtree inside the project layout
  // (side navigation, header, breadcrumbs) instead of the full-screen route error.
  errorComponent: RoutersErrorComponent,
})
