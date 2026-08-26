import { useEffect, useState } from "react"
import { Modal, Message, Spinner } from "@cloudoperators/juno-ui-components"
import { Trans, useLingui } from "@lingui/react/macro"
import { trpcReact } from "@/client/trpcClient"
import { useProjectId } from "@/client/hooks/useProjectId"
import { useModalTracking } from "@/client/hooks/useModalTracking"
import { validateLifecycleRules } from "./utils/lifecycleUtils"

interface DeleteLifecycleRuleModalProps {
  isOpen: boolean
  bucketName: string
  ruleIndex: number
  ruleId?: string
  onClose: () => void
  onSuccess?: (ruleIndex: number) => void
  onError?: (ruleIndex: number, errorMessage: string) => void
  onMutatingChange?: (isMutating: boolean) => void
}

/**
 * Modal to confirm deletion of a single lifecycle rule
 *
 * Refetches lifecycle configuration before deleting to avoid lost updates.
 * If deleting the last rule, calls lifecycle.delete instead of lifecycle.set.
 */
export const DeleteLifecycleRuleModal = ({
  isOpen,
  bucketName,
  ruleIndex,
  ruleId,
  onClose,
  onSuccess,
  onError,
  onMutatingChange,
}: DeleteLifecycleRuleModalProps) => {
  const { t } = useLingui()
  const projectId = useProjectId()
  const utils = trpcReact.useUtils()
  const [isVerifying, setIsVerifying] = useState(false)

  const { trackClose, markSubmitted, resetTracking } = useModalTracking({
    isOpen,
    actionPrefix: "storage.ceph.lifecycle.rule.delete",
  })

  // Query current lifecycle configuration (for loading/error states only - fresh data fetched in handleConfirm)
  const {
    data: lifecycleData,
    isLoading,
    error: queryError,
  } = trpcReact.storage.ceph.lifecycle.get.useQuery(
    {
      project_id: projectId,
      bucketName,
    },
    {
      enabled: isOpen && !!projectId,
      retry: false,
      staleTime: 5 * 60 * 1000,
    }
  )

  // Delete mutation (when removing last rule)
  const deleteMutation = trpcReact.storage.ceph.lifecycle.delete.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      onSuccess?.(ruleIndex)
      handleClose()
    },
    onError: (error) => {
      onError?.(ruleIndex, error.message)
    },
  })

  // Set mutation (when other rules remain)
  const setMutation = trpcReact.storage.ceph.lifecycle.set.useMutation({
    onSuccess: () => {
      utils.storage.ceph.lifecycle.get.invalidate()
      onSuccess?.(ruleIndex)
      handleClose()
    },
    onError: (error) => {
      onError?.(ruleIndex, error.message)
    },
  })

  const isMutating = deleteMutation.isPending || setMutation.isPending

  useEffect(() => {
    onMutatingChange?.(isMutating)
  }, [isMutating, onMutatingChange])

  useEffect(() => {
    if (!isOpen) {
      deleteMutation.reset()
      setMutation.reset()
      setIsVerifying(false)
      resetTracking()
    }
  }, [isOpen])

  const handleClose = () => {
    trackClose()
    deleteMutation.reset()
    setMutation.reset()
    setIsVerifying(false)
    resetTracking()
    onClose()
  }

  const handleConfirm = async () => {
    if (isVerifying) return

    markSubmitted()
    setIsVerifying(true)

    try {
      // Refetch to get fresh state
      const freshData = await utils.storage.ceph.lifecycle.get.fetch({
        project_id: projectId,
        bucketName,
      })

      const freshRules = freshData?.rules ?? []
      const cachedRule = lifecycleData?.rules?.[ruleIndex]
      const freshRule = freshRules[ruleIndex]

      // Freshness check: verify the rule at this index matches what the user selected
      if (!freshRule || JSON.stringify(freshRule) !== JSON.stringify(cachedRule)) {
        onError?.(ruleIndex, t`The lifecycle configuration has changed. Please refresh and try again.`)
        return
      }

      // Remove the rule
      const remaining = freshRules.filter((_, i) => i !== ruleIndex)

      if (remaining.length === 0) {
        // Last rule - delete entire configuration
        deleteMutation.mutate({
          project_id: projectId,
          bucketName,
        })
      } else {
        // Other rules remain - validate and set
        const validation = validateLifecycleRules(remaining)
        if (!validation.ok) {
          const errorMessage = validation.errors.join("; ")
          onError?.(ruleIndex, t`Cannot delete rule: ${errorMessage}`)
          return
        }

        setMutation.mutate({
          project_id: projectId,
          bucketName,
          lifecycleConfiguration: {
            Rules: validation.rules,
          },
        })
      }
    } catch (error) {
      onError?.(ruleIndex, error instanceof Error ? error.message : String(error))
    } finally {
      setIsVerifying(false)
    }
  }

  const ruleNumber = ruleIndex + 1
  const displayName = ruleId || t`Rule #${ruleNumber}`

  return (
    <Modal
      open={isOpen}
      onCancel={handleClose}
      title={t`Delete Lifecycle Rule`}
      size="small"
      confirmButtonLabel={isMutating ? t`Deleting...` : t`Delete Lifecycle Rule`}
      confirmButtonVariant="primary-danger"
      onConfirm={handleConfirm}
      cancelButtonLabel={t`Cancel`}
      disableConfirmButton={isMutating || isVerifying || isLoading || !!queryError}
      disableCancelButton={isMutating || isVerifying}
      disableCloseButton={isMutating || isVerifying}
      closeOnEsc={!(isMutating || isVerifying)}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner variant="primary" />
        </div>
      ) : queryError ? (
        <Message variant="error" title={t`Failed to load lifecycle configuration`}>
          {queryError.message}
        </Message>
      ) : (
        <>
          <p>
            <Trans>
              Are you sure you want to delete lifecycle rule <strong>{displayName}</strong> from bucket{" "}
              <strong>{bucketName}</strong>?
            </Trans>
          </p>
          <p className="mt-2">
            <Trans>This action cannot be undone.</Trans>
          </p>
        </>
      )}
    </Modal>
  )
}
