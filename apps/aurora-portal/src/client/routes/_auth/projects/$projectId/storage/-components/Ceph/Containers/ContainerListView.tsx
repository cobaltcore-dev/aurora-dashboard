import { useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { Link, useParams } from "@tanstack/react-router"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import {
  DataGrid,
  DataGridRow,
  DataGridCell,
  DataGridHeadCell,
  Spinner,
  Stack,
  Button,
  Toast,
  ToastProps,
} from "@cloudoperators/juno-ui-components"
import type { Container } from "@/server/Storage/types/ceph"
import { CredentialPrompt } from "./CredentialPrompt"
import { CreateBucketModal } from "./CreateBucketModal"
import { DeleteBucketModal } from "./DeleteBucketModal"
import {
  getBucketCreatedToast,
  getBucketCreateErrorToast,
  getBucketDeletedToast,
  getBucketDeleteErrorToast,
} from "./ContainerToastNotifications"

export function ContainerListView() {
  const { t } = useLingui()
  const projectId = useProjectId()
  const { provider } = useParams({ strict: false }) // Get provider from URL
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [deleteModalBucket, setDeleteModalBucket] = useState<Container | null>(null)
  const [toastData, setToastData] = useState<ToastProps | null>(null)

  const handleToastDismiss = () => setToastData(null)

  const {
    data: buckets,
    isLoading,
    error,
    refetch,
  } = trpcReact.storage.ceph.containers.list.useQuery(
    { project_id: projectId ?? "" },
    {
      enabled: !!projectId,
      retry: false, // Don't retry on NO_CEPH_CREDENTIALS error
    }
  )

  if (isLoading) {
    return (
      <Stack direction="horizontal" gap="2" alignment="center" className="mt-8">
        <Spinner />
        <span className="text-juno-grey-light-1 text-sm">
          <Trans>Loading containers...</Trans>
        </span>
      </Stack>
    )
  }

  if (error) {
    const errorMessage = error.message
    // Check if this is a NO_CEPH_CREDENTIALS error
    if (errorMessage === "NO_CEPH_CREDENTIALS") {
      return <CredentialPrompt onSuccess={() => refetch()} />
    }
    return (
      <p className="text-juno-red mt-4 text-sm">
        <Trans>Failed to load containers: {errorMessage}</Trans>
      </p>
    )
  }

  return (
    <>
      {/* Toast Notification */}
      {toastData && <Toast {...toastData} onDismiss={handleToastDismiss} />}

      {/* Modals */}
      <CreateBucketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(name) => {
          setToastData(getBucketCreatedToast(name, { onDismiss: handleToastDismiss }))
        }}
        onError={(name, error) => {
          setToastData(getBucketCreateErrorToast(name, error, { onDismiss: handleToastDismiss }))
        }}
      />

      <DeleteBucketModal
        isOpen={!!deleteModalBucket}
        bucket={deleteModalBucket}
        onClose={() => setDeleteModalBucket(null)}
        onSuccess={(name) => {
          setToastData(getBucketDeletedToast(name, { onDismiss: handleToastDismiss }))
        }}
        onError={(name, error) => {
          setToastData(getBucketDeleteErrorToast(name, error, { onDismiss: handleToastDismiss }))
        }}
      />

      {/* Action Buttons */}
      <Stack direction="horizontal" gap="2" className="mb-4">
        <Button
          variant="primary"
          size="small"
          onClick={() => setIsCreateModalOpen(true)}
          icon="addCircle"
          label={t`Create Bucket`}
        />
      </Stack>

      {/* Container List */}
      {!buckets || buckets.length === 0 ? (
        <DataGrid columns={3}>
          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Name</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Creation Date</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Actions</Trans>
            </DataGridHeadCell>
          </DataGridRow>
          <DataGridRow>
            <DataGridCell colSpan={3}>
              <span className="text-juno-grey-light-1 text-sm">
                <Trans>No containers found.</Trans>
              </span>
            </DataGridCell>
          </DataGridRow>
        </DataGrid>
      ) : (
        <DataGrid columns={3}>
          <DataGridRow>
            <DataGridHeadCell>
              <Trans>Name</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Creation Date</Trans>
            </DataGridHeadCell>
            <DataGridHeadCell>
              <Trans>Actions</Trans>
            </DataGridHeadCell>
          </DataGridRow>
          {buckets?.map((bucket: Container) => (
            <DataGridRow key={bucket.name}>
              <DataGridCell>
                <Link
                  to="/projects/$projectId/storage/$provider/containers/$containerName/objects"
                  params={{
                    projectId: projectId ?? "",
                    provider: (provider as string) ?? "ceph",
                    containerName: bucket.name,
                  }}
                >
                  <span className="hover:text-juno-blue cursor-pointer font-mono text-sm underline">{bucket.name}</span>
                </Link>
              </DataGridCell>
              <DataGridCell>
                <span className="text-juno-grey-light-1 text-sm">
                  {bucket.creationDate ? new Date(bucket.creationDate).toLocaleString() : <Trans>Unknown</Trans>}
                </span>
              </DataGridCell>
              <DataGridCell>
                <Button
                  variant="subdued"
                  size="small"
                  icon="deleteForever"
                  onClick={() => setDeleteModalBucket(bucket)}
                  title="Delete bucket"
                />
              </DataGridCell>
            </DataGridRow>
          ))}
        </DataGrid>
      )}
    </>
  )
}
