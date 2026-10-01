import { createFileRoute } from "@tanstack/react-router"
import { msg, t } from "@lingui/core/macro"
import { Trans, useLingui } from "@lingui/react/macro"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeader } from "@/client/components/ContentHeader/ContentHeader"

export const Route = createFileRoute("/_auth/projects/$projectId/network/routers/$routerId")({
  staticData: {
    section: "network",
    service: "routers",
    analytics: {
      name: "network.routers.details",
    },
    crumb: { text: msg`Router Details` },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Router Details` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId, routerId } = Route.useParams()

  // TODO: implement router details (Basic Info, External Gateway, Extra Routes, Router Interfaces, Advanced attributes)
  return (
    <>
      <ContentHeader title={t`Router Details`} projectId={projectId} />
      <p className="text-theme-light text-sm" data-testid="router-details-placeholder">
        <Trans>Details for router {routerId} coming soon.</Trans>
      </p>
    </>
  )
}
