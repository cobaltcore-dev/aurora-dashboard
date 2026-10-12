import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { Button } from "@cloudoperators/juno-ui-components"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"

const NetworksErrorComponent = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  return (
    <RouteIdLevelDefaultError
      action={
        <Button
          variant="primary"
          onClick={() => navigate({ to: "/projects/$projectId/network/networks", params: { projectId } })}
        >
          {t`Back to Networks`}
        </Button>
      }
    />
  )
}

export const Route = createFileRoute("/_auth/projects/$projectId/network/networks")({
  staticData: {
    section: "network",
    service: "networks",
    crumb: { text: msg`Networks` },
  } satisfies RouteInfo,
  component: () => <Outlet />,
  // Render errors from the networks subtree inside the project layout
  // (side navigation, header, breadcrumbs) instead of the full-screen route error.
  errorComponent: NetworksErrorComponent,
})
