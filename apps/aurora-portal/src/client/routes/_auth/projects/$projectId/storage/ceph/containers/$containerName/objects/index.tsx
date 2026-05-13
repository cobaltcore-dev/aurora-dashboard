import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { ObjectBrowserView } from "../../../../-components/Ceph/Objects"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/ceph/containers/$containerName/objects/")({
  staticData: { section: "storage", service: "ceph-containers" } satisfies RouteInfo,
  component: S3ObjectsPage,
})

function S3ObjectsPage() {
  const { containerName } = Route.useParams()

  return (
    <Stack direction="vertical" gap="4">
      <ContentHeading>
        <Trans>Container: {containerName}</Trans>
      </ContentHeading>
      <ObjectBrowserView bucketName={containerName} />
    </Stack>
  )
}
