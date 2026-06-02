import { createFileRoute } from "@tanstack/react-router"
import { useLingui } from "@lingui/react/macro"
import { SecurityGroups } from "./-components/SecurityGroupsList"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"

export const Route = createFileRoute("/_auth/projects/$projectId/network/securitygroups/")({
  staticData: {
    section: "network",
    service: "securitygroups",
    sectionCrumb: { label: "Network" },
    crumb: { label: "Security Groups" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: "Security Groups" }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  return (
    <>
      <ContentHeading>{t`Security Groups`}</ContentHeading>
      <SecurityGroups />
    </>
  )
}
