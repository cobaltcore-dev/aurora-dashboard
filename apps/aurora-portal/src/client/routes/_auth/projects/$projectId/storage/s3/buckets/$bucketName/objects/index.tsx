import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { S3ObjectBrowserView } from "../../../../-components/S3/S3ObjectBrowserView"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/s3/buckets/$bucketName/objects/")({
  staticData: { section: "storage", service: "s3-buckets" } satisfies RouteInfo,
  component: S3ObjectsPage,
})

function S3ObjectsPage() {
  const { bucketName } = Route.useParams()

  return (
    <Stack direction="vertical" gap="4">
      <ContentHeading>
        <Trans>S3 Bucket: {bucketName}</Trans>
      </ContentHeading>
      <S3ObjectBrowserView bucketName={bucketName} />
    </Stack>
  )
}
