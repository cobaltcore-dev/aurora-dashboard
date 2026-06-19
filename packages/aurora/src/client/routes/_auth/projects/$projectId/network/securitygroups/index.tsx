import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { SecurityGroups } from "./-components/SecurityGroupsList"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"

export const Route = createFileRoute("/_auth/projects/$projectId/network/securitygroups/")({
  staticData: {
    section: "network",
    service: "securitygroups",
    sectionCrumb: { labelKey: "Network" },
    crumb: { labelKey: "Security Groups" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Security Groups` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  const { projectId } = Route.useParams()
  const { trpcClient } = Route.useRouteContext()

  if (!trpcClient) {
    throw new Error("trpcClient is not available in route context")
  }

  return (
    <>
      <ContentHeading>{t`Security Groups`}</ContentHeading>
      <SecurityGroups client={trpcClient} project={projectId} />
    </>
  )
}
