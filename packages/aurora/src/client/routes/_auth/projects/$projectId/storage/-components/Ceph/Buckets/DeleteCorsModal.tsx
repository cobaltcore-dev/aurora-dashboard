import { useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"

interface DeleteCorsModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const DeleteCorsModal = ({ isOpen, bucketName, onClose, onSuccess, onError }: DeleteCorsModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.bucket.cors.delete",
  })

  // Query to verify CORS configuration exists
  const {
    data: corsData,
    isLoading: isCorsLoading,
    error: corsError,
  } = trpcReact.storage.ceph.cors.get.useQuery(
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
  const deleteMutation = trpcReact.storage.ceph.cors.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
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

  const hasCors = !!corsData?.corsRules && corsData.corsRules.length > 0
  const isDeleting = deleteMutation.isPending

  return (
    <Modal
      title={t`Delete CORS Configuration`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={t`Delete CORS`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleDelete}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isDeleting || isCorsLoading || !hasCors || !!corsError}
    >
      <Stack direction="vertical" gap="4">
        {isCorsLoading && (
          <div className="flex items-center justify-center py-4">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {corsError && (
          <Message variant="error" title={t`Failed to load CORS configuration`}>
            {corsError.message}
          </Message>
        )}

        {!isCorsLoading && !corsError && !hasCors && (
          <Message variant="warning" title={t`No CORS configuration found`}>
            <Trans>This bucket does not have CORS rules configured.</Trans>
          </Message>
        )}

        {!isCorsLoading && !corsError && hasCors && (
          <>
            <p className="text-theme-default">
              <Trans>
                Are you sure you want to delete the CORS configuration for bucket <strong>{bucketName}</strong>?
              </Trans>
            </p>
            <p className="text-theme-default">
              <Trans>
                Deleting the CORS configuration will remove all cross-origin access rules. Browser-based applications
                will no longer be able to access this bucket from different origins. This action cannot be undone.
              </Trans>
            </p>
            {corsData?.corsRules && (
              <p className="text-theme-default text-sm">
                <Trans>
                  Current configuration has {corsData.corsRules.length} CORS{" "}
                  {corsData.corsRules.length === 1 ? "rule" : "rules"}.
                </Trans>
              </p>
            )}
          </>
        )}

        {deleteMutation.isError && (
          <Message variant="error" title={t`Failed to delete CORS configuration`}>
            {deleteMutation.error?.message}
          </Message>
        )}
      </Stack>
    </Modal>
  )
}
