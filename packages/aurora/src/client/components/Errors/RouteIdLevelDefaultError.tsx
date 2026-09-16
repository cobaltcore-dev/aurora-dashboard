import { ReactNode } from "react"
import { useLingui } from "@lingui/react/macro"
import { useParams, useNavigate } from "@tanstack/react-router"
import { Button, Status } from "@cloudoperators/juno-ui-components"

interface RouteIdLevelDefaultErrorProps {
  errorTitle?: string
  errorDescription?: string
  action?: ReactNode
}

/**
 * Renders the default error state for resource detail pages at the route-ID
 * level, while keeping the surrounding application layout visible.
 *
 * This is similar to the service-level not-found component, but remains
 * separate to make route error handling easier to trace. Callers can provide
 * resource-specific titles, descriptions, and actions; otherwise, the default
 * action navigates back to the current project.
 */
export const RouteIdLevelDefaultError = ({ errorTitle, errorDescription, action }: RouteIdLevelDefaultErrorProps) => {
  const { t } = useLingui()
  const navigate = useNavigate()
  const { projectId } = useParams({ strict: false })

  const navigateToProjectId = () =>
    projectId ? navigate({ to: "/projects/$projectId", params: { projectId } }) : navigate({ to: "/" })

  return (
    <Status
      code={404}
      status="error"
      title={errorTitle || t`Resource Not Found`}
      body={errorDescription || t`The Resource you are looking for does not exist or is not accessible.`}
      action={
        action ?? (
          <Button variant="primary" onClick={navigateToProjectId}>
            {t`Go to Project Home`}
          </Button>
        )
      }
    />
  )
}
