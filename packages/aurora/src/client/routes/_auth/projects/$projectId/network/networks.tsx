import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { Button } from "@cloudoperators/juno-ui-components"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

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
  errorComponent: NetworksErrorComponent,
})
