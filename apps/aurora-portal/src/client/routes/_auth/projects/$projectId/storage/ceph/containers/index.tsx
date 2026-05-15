import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { ContainerListView } from "../../-components/Ceph/Containers"
import { ServiceInfoTooltip } from "../../-components/Ceph/ServiceInfo"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/ceph/containers/")({
  staticData: { section: "storage", service: "ceph-containers" } satisfies RouteInfo,
  component: S3BucketsPage,
})

function S3BucketsPage() {
  return (
    <Stack direction="vertical" gap="4">
      <Stack direction="horizontal" distribution="between" alignment="center">
        <ContentHeading>
          <Trans>Containers</Trans>
        </ContentHeading>
        <ServiceInfoTooltip />
      </Stack>
      <ContainerListView />
    </Stack>
  )
}
