import { useEffect, useState } from "react"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { Modal, Stack, Spinner, Message } from "@cloudoperators/juno-ui-components"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { toCorsRule } from "./utils/corsUtils"

interface DeleteCorsRuleModalProps {
  isOpen: boolean
  bucketName: string
  ruleIndex: number
  ruleId?: string
  onClose: () => void
  onSuccess?: (ruleIndex: number) => void
  onError?: (ruleIndex: number, errorMessage: string) => void
  onMutatingChange?: (isMutating: boolean) => void
}

export const DeleteCorsRuleModal = ({
  isOpen,
  bucketName,
  ruleIndex,
  ruleId,
  onClose,
  onSuccess,
  onError,
  onMutatingChange,
}: DeleteCorsRuleModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [isVerifying, setIsVerifying] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.cors.rule.delete",
  })

  // Query to get current CORS rules
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

  // Set mutation (for updating with remaining rules)
  const setMutation = trpcReact.storage.ceph.cors.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(ruleIndex)
      handleClose()
    },
    onError: (error) => {
      onError?.(ruleIndex, error.message)
    },
  })

  // Delete mutation (for removing all CORS config when last rule is deleted)
  const deleteMutation = trpcReact.storage.ceph.cors.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.cors.get.invalidate()
      onSuccess?.(ruleIndex)
      handleClose()
    },
    onError: (error) => {
      onError?.(ruleIndex, error.message)
    },
  })

  useEffect(() => {
    onMutatingChange?.(setMutation.isPending || deleteMutation.isPending)
  }, [setMutation.isPending, deleteMutation.isPending, onMutatingChange])

  useEffect(() => {
    if (!isOpen) {
      setMutation.reset()
      deleteMutation.reset()
      setIsVerifying(false)
      resetTracking()
    }
  }, [isOpen, ruleIndex])

  const handleClose = () => {
    setMutation.reset()
    deleteMutation.reset()
    setIsVerifying(false)
    resetTracking()
    onClose()
  }

  const handleDelete = async () => {
    if (isVerifying) return

    markSubmitted()
    setIsVerifying(true)

    try {
      // Refetch to get fresh data
      const freshData = await utils.storage.ceph.cors.get.fetch({
        project_id: projectId,
        bucketName,
      })

      const freshRules = freshData?.corsRules ?? []
      const cachedRule = corsData?.corsRules?.[ruleIndex]
      const freshRule = freshRules[ruleIndex]

      // Freshness check
      if (!freshRule || JSON.stringify(freshRule) !== JSON.stringify(cachedRule)) {
        onError?.(ruleIndex, t`The CORS configuration has changed. Please refresh and try again.`)
        return
      }

      // Proceed with deletion using fresh data
      const updatedRules = freshRules.filter((_, index) => index !== ruleIndex)

      if (updatedRules.length === 0) {
        // If no rules left, delete the entire CORS configuration
        deleteMutation.mutate({
          project_id: projectId,
          bucketName,
        })
      } else {
        // Otherwise, update with the remaining rules
        setMutation.mutate({
          project_id: projectId,
          bucketName,
          corsConfiguration: {
            CORSRules: updatedRules.map(toCorsRule),
          },
        })
      }
    } catch {
      onError?.(ruleIndex, t`Failed to verify CORS configuration`)
    } finally {
      setIsVerifying(false)
    }
  }

  if (!isOpen) return null

  const ruleDisplayName = ruleId || `Rule #${ruleIndex + 1}`
  const hasRules = (corsData?.corsRules ?? []).length > 0
  const isDeleting = setMutation.isPending || deleteMutation.isPending

  return (
    <Modal
      title={t`Delete CORS Rule`}
      open={isOpen}
      onCancel={() => {
        trackClose()
        handleClose()
      }}
      confirmButtonLabel={t`Delete CORS Rule`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleDelete}
      cancelButtonLabel={t`Cancel`}
      size="small"
      disableConfirmButton={isDeleting || isCorsLoading || !hasRules || !!corsError || isVerifying}
    >
      <Stack direction="vertical" gap="4">
        {isCorsLoading && (
          <div className="flex items-center justify-center py-4">
            <Spinner variant="primary" size="large" />
          </div>
        )}

        {corsError && (
          <Message variant="error" title={t`Failed to load CORS rules`}>
            {corsError.message}
          </Message>
        )}

        {!isCorsLoading && !corsError && !hasRules && (
          <Message variant="warning" title={t`No rules found`}>
            <Trans>This bucket does not have any CORS rules.</Trans>
          </Message>
        )}

        {!isCorsLoading && !corsError && hasRules && (
          <>
            <p className="text-theme-default">
              <Trans>
                Are you sure you want to delete <strong>{ruleDisplayName}</strong> from bucket{" "}
                <strong>{bucketName}</strong>?
              </Trans>
            </p>
            <p className="text-theme-default">
              <Trans>This action cannot be undone.</Trans>
            </p>
          </>
        )}

        {setMutation.isError && (
          <Message variant="error" title={t`Failed to delete rule`}>
            {setMutation.error?.message}
          </Message>
        )}

        {deleteMutation.isError && (
          <Message variant="error" title={t`Failed to delete rule`}>
            {deleteMutation.error?.message}
          </Message>
        )}
      </Stack>
    </Modal>
  )
}
