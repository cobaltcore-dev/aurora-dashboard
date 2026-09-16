import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"
import { RouteIdLevelDefaultError } from "@/client/components/Errors/RouteIdLevelDefaultError"
import { Button } from "@cloudoperators/juno-ui-components"
import { msg } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"

const FloatingIpsErrorComponent = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = Route.useParams()

  return (
    <RouteIdLevelDefaultError
      action={
        <Button
          variant="primary"
          onClick={() => navigate({ to: "/projects/$projectId/network/floatingips", params: { projectId } })}
        >
          {t`Back to Floating IPs`}
        </Button>
      }
    />
  )
}

export const Route = createFileRoute("/_auth/projects/$projectId/network/floatingips")({
  staticData: {
    section: "network",
    service: "floatingips",
    crumb: { text: msg`Floating IPs` },
  } satisfies RouteInfo,
  component: () => <Outlet />,
  // Render errors from the floating IPs subtree inside the project layout
  // (side navigation, header, breadcrumbs) instead of the full-screen route error.
  errorComponent: FloatingIpsErrorComponent,
})
