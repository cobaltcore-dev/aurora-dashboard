import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { ContainerListView } from "../../-components/Ceph/Containers"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/ceph/containers/")({
  staticData: { section: "storage", service: "ceph-containers" } satisfies RouteInfo,
  component: S3BucketsPage,
})

function S3BucketsPage() {
  return (
    <Stack direction="vertical" gap="4">
      <ContentHeading>
        <Trans>Containers</Trans>
      </ContentHeading>
      <ContainerListView />
    </Stack>
  )
}
