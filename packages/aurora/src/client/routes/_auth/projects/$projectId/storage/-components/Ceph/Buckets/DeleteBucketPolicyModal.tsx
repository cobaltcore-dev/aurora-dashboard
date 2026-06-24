import { useEffect } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"

interface DeleteBucketPolicyModalProps {
  isOpen: boolean
  bucketName: string
  onClose: () => void
  onSuccess?: (bucketName: string) => void
  onError?: (bucketName: string, errorMessage: string) => void
}

export const DeleteBucketPolicyModal = ({
  isOpen,
  bucketName,
  onClose,
  onSuccess,
  onError,
}: DeleteBucketPolicyModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()

  // Query to verify policy exists
  const {
    data: policyData,
    isLoading: isPolicyLoading,
    error: policyError,
  } = trpcReact.storage.ceph.bucketPolicy.get.useQuery(
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
  const deleteMutation = trpcReact.storage.ceph.bucketPolicy.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.bucketPolicy.get.invalidate()
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
    }
  }, [isOpen, bucketName])

  const handleClose = () => {
    deleteMutation.reset()
    onClose()
  }

  const handleDelete = () => {
    deleteMutation.mutate({
      project_id: projectId,
      bucketName,
    })
  }

  if (!isOpen) return null

  const hasPolicy = !!policyData?.policy
  const isDeleting = deleteMutation.isPending

  return (
    <Modal
      title={t`Delete Bucket Policy`}
      open={isOpen}
      onCancel={handleClose}
      confirmButtonLabel={t`Delete Policy`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleDelete}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isDeleting || isPolicyLoading || !hasPolicy || !!policyError}
    >
      <Stack direction="vertical" gap="4">
        {isPolicyLoading && (
          <div className="flex items-center justify-center py-4">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {policyError && (
          <Message variant="error" title={t`Failed to load policy`}>
            {policyError.message}
          </Message>
        )}

        {!isPolicyLoading && !policyError && !hasPolicy && (
          <Message variant="warning" title={t`No policy found`}>
            <Trans>This bucket does not have a policy attached.</Trans>
          </Message>
        )}

        {!isPolicyLoading && !policyError && hasPolicy && (
          <>
            <p className="text-theme-default">
              <Trans>
                Are you sure you want to delete the policy for bucket <strong>{bucketName}</strong>?
              </Trans>
            </p>
            <p className="text-theme-default">
              <Trans>
                Deleting the policy will remove all access restrictions defined by it. This action cannot be undone.
              </Trans>
            </p>
          </>
        )}

        {deleteMutation.isError && (
          <Message variant="error" title={t`Failed to delete policy`}>
            {deleteMutation.error?.message}
          </Message>
        )}
      </Stack>
    </Modal>
  )
}
