import { useEffect } from "react"
import { Trans, useLingui, Plural } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteLifecycleModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const DeleteLifecycleModal = ({
  isOpen,
  bucketName,
  onClose,
  onSuccess,
  onError,
}: DeleteLifecycleModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.lifecycle.delete",
  })

  // Query to verify lifecycle configuration exists
  const {
    data: lifecycleData,
    isLoading: isLifecycleLoading,
    error: lifecycleError,
  } = trpcReact.storage.ceph.lifecycle.get.useQuery(
    {
      project_id: projectId,
      bucketName,
    },
    {
      enabled: isOpen && !!projectId,
      retry: false,
    }
  )

  // Delete mutation
  const deleteMutation = trpcReact.storage.ceph.lifecycle.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      const name = bucketName
      onSuccess?.(name)
      handleClose()
    },
    onError: (error) => {
      const name = bucketName
      onError?.(name, error.message)
    },
  })

  useEffect(() => {
    if (!isOpen) {
      deleteMutation.reset()
      resetTracking()
    }
  }, [isOpen, bucketName])

  const handleClose = () => {
    deleteMutation.reset()
    resetTracking()
    onClose()
  }

  const handleDelete = () => {
    markSubmitted()
    deleteMutation.mutate({
      project_id: projectId,
      bucketName,
    })
  }

  if (!isOpen) return null

  const hasLifecycle = !!lifecycleData?.rules && lifecycleData.rules.length > 0
  const isDeleting = deleteMutation.isPending

  return (
    <Modal
      title={t`Delete Lifecycle Configuration`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={t`Delete Lifecycle`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleDelete}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isDeleting || isLifecycleLoading || !hasLifecycle || !!lifecycleError}
    >
      <Stack direction="vertical" gap="4">
        {isLifecycleLoading && (
          <div className="flex items-center justify-center py-4">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {lifecycleError && (
          <Message variant="error" title={t`Failed to load lifecycle configuration`}>
            {lifecycleError.message}
          </Message>
        )}

        {!isLifecycleLoading && !lifecycleError && !hasLifecycle && (
          <Message variant="warning" title={t`No lifecycle configuration found`}>
            <Trans>This bucket does not have lifecycle rules configured.</Trans>
          </Message>
        )}

        {!isLifecycleLoading && !lifecycleError && hasLifecycle && (
          <>
            <p className="text-theme-default">
              <Trans>
                Are you sure you want to delete the lifecycle configuration for bucket <strong>{bucketName}</strong>?
              </Trans>
            </p>
            <p className="text-theme-default">
              <Trans>
                Deleting the lifecycle configuration will remove all automated lifecycle management rules. Objects will
                no longer be automatically expired, transitioned, or have their old versions cleaned up. This action
                cannot be undone.
              </Trans>
            </p>
            {lifecycleData?.rules && (
              <p className="text-theme-default text-sm">
                <Trans>
                  Current configuration has{" "}
                  <Plural value={lifecycleData.rules.length} one="# lifecycle rule" other="# lifecycle rules" />.
                </Trans>
              </p>
            )}
          </>
        )}

        {deleteMutation.isError && (
          <Message variant="error" title={t`Failed to delete lifecycle configuration`}>
            {deleteMutation.error?.message}
          </Message>
        )}
      </Stack>
    </Modal>
  )
}
