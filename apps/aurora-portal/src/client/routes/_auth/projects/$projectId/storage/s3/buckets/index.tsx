import { createFileRoute } from "@tanstack/react-router"
import { Trans } from "@lingui/react/macro"
import { ContentHeading, Stack } from "@cloudoperators/juno-ui-components"
import { BucketListView } from "../../-components/S3/BucketListView"
import type { RouteInfo } from "@/client/routes/routeInfo"

export const Route = createFileRoute("/_auth/projects/$projectId/storage/s3/buckets/")({
  staticData: { section: "storage", service: "s3-buckets" } satisfies RouteInfo,
  component: S3BucketsPage,
})

function S3BucketsPage() {
  return (
    <Stack direction="vertical" gap="4">
      <ContentHeading>
        <Trans>S3 Buckets</Trans>
      </ContentHeading>
      <BucketListView />
    </Stack>
  )
}
