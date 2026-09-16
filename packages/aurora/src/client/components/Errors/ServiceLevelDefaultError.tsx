import { useLingui } from "@lingui/react/macro"
import { useNavigate, useParams } from "@tanstack/react-router"
import { Status, Button } from "@cloudoperators/juno-ui-components"

/**
 * Renders the default not-found state inside the application layout.
 *
 * This component is used as the router's `defaultNotFoundComponent` for routes
 * that do not exist, such as a mistyped path (`network/floatingips` entered as
 * `netrowk/floatingips`). Unlike a route-level error, it does not break the
 * layout and keeps the header and navigation visible.
 */
export const ServiceLevelDefaultError = () => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false })

  const navigateToProjectId = () =>
    projectId ? navigate({ to: "/projects/$projectId", params: { projectId } }) : navigate({ to: "/" })

  return (
    <Status
      code={404}
      status="error"
      action={
        <Button variant="primary" onClick={navigateToProjectId}>
          {t`Go to Project Home`}
        </Button>
      }
    />
  )
}
