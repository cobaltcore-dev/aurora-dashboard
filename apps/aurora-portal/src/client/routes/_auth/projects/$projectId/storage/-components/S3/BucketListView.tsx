import { Trans } from "@lingui/react/macro"
import { Link } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import {
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  Spinner,
  Stack,
} from "@cloudoperators/juno-ui-components"
import type { Bucket } from "@/server/Storage/types/s3"

export function BucketListView() {
  const projectId = useProjectId()

  const {
    data: buckets,
    isLoading,
    error,
  } = trpcReact.storage.s3.buckets.list.useQuery({ project_id: projectId ?? "" }, { enabled: !!projectId })

  if (isLoading) {
    return (
      <Stack direction="horizontal" gap="2" alignment="center" className="mt-8">
        <Spinner />
        <span className="text-juno-grey-light-1 text-sm">
          <Trans>Loading buckets...</Trans>
        </span>
      </Stack>
    )
  }

  if (error) {
    return (
      <p className="text-juno-red mt-4 text-sm">
        <Trans>Failed to load buckets: {error.message}</Trans>
      </p>
    )
  }

  if (!buckets || buckets.length === 0) {
    return (
      <DataGrid columns={2}>
        <DataGridRow>
          <DataGridHeadCell>
            <Trans>Name</Trans>
          </DataGridHeadCell>
          <DataGridHeadCell>
            <Trans>Creation Date</Trans>
          </DataGridHeadCell>
        </DataGridRow>
        <DataGridRow>
          <DataGridCell colSpan={2}>
            <span className="text-juno-grey-light-1 text-sm">
              <Trans>No buckets found.</Trans>
            </span>
          </DataGridCell>
        </DataGridRow>
      </DataGrid>
    )
  }

  return (
    <DataGrid columns={2}>
      <DataGridRow>
        <DataGridHeadCell>
          <Trans>Name</Trans>
        </DataGridHeadCell>
        <DataGridHeadCell>
          <Trans>Creation Date</Trans>
        </DataGridHeadCell>
      </DataGridRow>
      {buckets.map((bucket: Bucket) => (
        <DataGridRow key={bucket.name}>
          <DataGridCell>
            <Link
              to="/projects/$projectId/storage/s3/buckets/$bucketName/objects"
              params={{ projectId: projectId ?? "", bucketName: bucket.name }}
            >
              <span className="hover:text-juno-blue cursor-pointer font-mono text-sm underline">{bucket.name}</span>
            </Link>
          </DataGridCell>
          <DataGridCell>
            <span className="text-juno-grey-light-1 text-sm">
              {bucket.creationDate ? new Date(bucket.creationDate).toLocaleString() : <Trans>Unknown</Trans>}
            </span>
          </DataGridCell>
        </DataGridRow>
      ))}
    </DataGrid>
  )
}
