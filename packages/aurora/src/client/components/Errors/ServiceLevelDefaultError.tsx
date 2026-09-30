import { useLingui } from "@lingui/react/macro"
import { useLocation, useNavigate, useParams } from "@tanstack/react-router"
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
  const { pathname } = useLocation()

  // Best-effort guess at the unrecognized service segment the user typed.
  // The route didn't match, so this comes straight from the URL rather than
  // params. Take the segment(s) right after the projectId, and only surface it
  // if it looks like a real route slug so a pathological URL can't inject junk
  // into the message.
  const enteredService = (() => {
    if (!projectId) return undefined
    const segments = pathname.split("/").filter(Boolean) // ["projects", "<id>", "netrowk", "floatingips"]
    const idIndex = segments.indexOf(projectId)
    const candidate = idIndex >= 0 ? segments.slice(idIndex + 1, idIndex + 3).join("/") : ""
    return candidate && /^[a-z0-9/-]+$/i.test(candidate) ? candidate : undefined
  })()

  const navigateToProjectId = () =>
    projectId ? navigate({ to: "/projects/$projectId", params: { projectId } }) : navigate({ to: "/" })

  const body = (() => {
    if (!projectId) {
      return t`We couldn't find the page you're looking for. It may have been moved, or the address may be incorrect.`
    }
    if (enteredService) {
      return t`The service "${enteredService}" doesn't exist in this project. Check the URL, or return to your project home.`
    }
    return t`This service doesn't exist in this project. Check the URL, or return to your project home.`
  })()

  return (
    <Status
      status="error"
      title={projectId ? t`Service not found` : t`Page not found`}
      body={body}
      action={
        <Button variant="primary" onClick={navigateToProjectId}>
          {projectId ? t`Go to Project Home` : t`Go to Home`}
        </Button>
      }
    />
  )
}
