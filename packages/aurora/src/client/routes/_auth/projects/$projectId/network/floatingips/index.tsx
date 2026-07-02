import { createFileRoute } from "@tanstack/react-router"
import { t } from "@lingui/core/macro"
import { useLingui } from "@lingui/react/macro"
import { FloatingIpsList } from "./-components/FloatingIpsList"
import type { RouteInfo } from "@/client/routes/routeInfo"
import { ContentHeading } from "@cloudoperators/juno-ui-components"

export const Route = createFileRoute("/_auth/projects/$projectId/network/floatingips/")({
  staticData: {
    section: "network",
    service: "floatingips",
    analytics: {
      name: "network.floatingips.list",
    },
    sectionCrumb: { labelKey: "Network" },
    crumb: { labelKey: "Floating IPs" },
  } satisfies RouteInfo,
  head: () => ({ meta: [{ title: t`Floating IPs` }] }),
  component: RouteComponent,
})

function RouteComponent() {
  const { t } = useLingui()
  return (
    <>
      <ContentHeading>{t`Floating IPs`}</ContentHeading>
      <FloatingIpsList />
    </>
  )
}
